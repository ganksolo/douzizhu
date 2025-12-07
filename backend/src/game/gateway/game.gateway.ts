import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { GameManagerService } from '../services/game-manager.service';
import { StateSerializer } from '../services/state-serializer.service';
import { ActionPipelineService } from '../engine/action-pipeline/action-pipeline.service';
import { UserAction } from '../types/game.types';
import { AuthService } from '../../auth/auth.service';
import { ReconnectService } from '../../room/services/reconnect.service';
import { AFKService } from '../../room/services/afk.service';
import { BotService } from '../bot.service';
import { RoomService } from '../../room/room.service';
import { Inject, forwardRef } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: 'game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    @WebSocketServer()
    server: Server;

    private logger = new Logger(GameGateway.name);

    constructor(
        private gameManager: GameManagerService,
        private stateSerializer: StateSerializer,
        private actionPipeline: ActionPipelineService,
        private authService: AuthService,
        private reconnectService: ReconnectService,
        private afkService: AFKService,
        private botService: BotService,
        @Inject(forwardRef(() => RoomService)) private roomService: RoomService,
    ) { }

    afterInit() {
        // Start simple game loop (100ms tick) for all rooms
        setInterval(() => {
            const rooms = this.gameManager.getAllRooms();
            for (const roomId of rooms) {
                const context = this.gameManager.getOrCreateRoom(roomId);
                context.update(0.1);
            }
        }, 100);

        this.logger.log('Game Loop started');
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);

        // Extract token from query or auth header
        const token = client.handshake.auth?.token || client.handshake.query?.token;

        if (!token) {
            this.logger.warn(`Client ${client.id} missing token. Disconnecting...`);
            client.disconnect();
            return;
        }

        const payload = this.authService.verifyToken(token as string);
        if (!payload) {
            this.logger.warn(`Client ${client.id} invalid token. Disconnecting...`);
            client.disconnect();
            return;
        }

        // Store user info in socket data
        client.data.userId = payload.sub;
        client.data.username = payload.username;
        this.logger.log(`Client ${client.id} authenticated as ${payload.username} (${payload.sub})`);
    }

    async handleDisconnect(client: Socket) {
        const userId = client.data.userId;
        const roomId = client.data.roomId;
        this.logger.log(`Client disconnected: ${client.id} (User: ${userId}, Room: ${roomId})`);

        if (userId && roomId) {
            await this.reconnectService.handleDisconnect(roomId, userId);
        }
    }

    @SubscribeMessage('join_room')
    async handleJoinRoom(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const { roomId } = data;
            const playerId = client.data.userId;
            const username = client.data.username;

            if (!playerId) {
                throw new Error('User not authenticated');
            }

            client.join(roomId);
            client.data.roomId = roomId;
            client.data.playerId = playerId;

            this.logger.log(`Player ${username} (${playerId}) joined room ${roomId}`);

            // 1. Sync with RoomService (Redis)
            // Note: We don't have avatar in token yet, defaulting.
            const players = await this.roomService.joinRoom(roomId, {
                id: playerId,
                nickname: username,
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + playerId
            });

            // 2. Broadcast updated list to room
            this.server.to(roomId).emit('player_list_update', { roomId, players });

            // Handle Reconnect Logic
            await this.reconnectService.handleReconnect(roomId, playerId);

            // Initialize Game Context if needed for state syncing
            const gameContext = this.gameManager.getOrCreateRoom(roomId);
            if (!gameContext.onStateChange) {
                gameContext.onStateChange = (rid) => this.broadcastState(rid);
            }

            // Sync GameState
            await this.broadcastState(roomId);

            // Attempt to start if this join completes the table (and autostart is enabled)?
            // Currently start is triggered by Ready.
        } catch (error) {
            this.logger.error(`Error in join_room: ${error.message}`);
            client.emit('exception', { status: 'error', message: error.message });
        }
    }

    @SubscribeMessage('toggle_ready')
    async handleToggleReady(
        @MessageBody() data: { roomId: string, isReady?: boolean },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const { roomId } = data;
            const playerId = client.data.userId;
            // Toggle logic: if isReady undefined, assumption is toggle? 
            // RoomService.toggleReady requires boolean. 
            // Let's assume the client sends the *target* state or we need to fetch current and flip.
            // Simplified: Client should send target state. Defaults to true if missing? 
            // Or RoomUI sends current ready state. 
            // Let's assume true for now if not provided, or implement a fetch-flip.
            // Better: Client should send `isReady`.

            const targetState = data.isReady !== undefined ? data.isReady : true; // Default to true?

            const players = await this.roomService.toggleReady(roomId, playerId, targetState);

            // Broadcast update
            this.server.to(roomId).emit('player_list_update', { roomId, players });

            // Try Start Game
            const started = await this.roomService.tryStartGame(roomId);
            if (started) {
                this.server.to(roomId).emit('game_start', { roomId });
                // Also broadcast initial game state
                await this.broadcastState(roomId);
            }

        } catch (error) {
            this.logger.error(`Error in toggle_ready: ${error.message}`);
            client.emit('exception', { status: 'error', message: error.message });
        }
    }

    @SubscribeMessage('client_action')
    async handleClientAction(
        @MessageBody() action: UserAction & { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const { roomId } = action;
        const playerId = client.data.playerId || action.playerId;
        this.logger.log(`Received action ${action.type} from ${playerId} in room ${roomId}`);

        try {
            // Update Activity
            await this.afkService.updateActivity(roomId, playerId);

            const gameContext = this.gameManager.getOrCreateRoom(roomId);

            // Use Action Pipeline (Phase 18.3)
            // Pipeline handles: Normalize → Lock → Execute → Save → Unlock → Broadcast
            await this.actionPipeline.execute(
                gameContext,
                action, // Raw input
                playerId, // Trusted ID
                async () => await this.broadcastState(roomId) // Broadcast callback
            );

            this.logger.log(`Action ${action.type} processed successfully for room ${roomId}`);

        } catch (error) {
            this.logger.error(`Error processing action in room ${roomId}: ${error.message}`);
            // Send error to client
            client.emit('action_error', {
                type: 'error',
                code: 'ACTION_FAILED',
                message: error.message || 'Failed to process action',
                action: action.type
            });
        }
    }

    private async broadcastState(roomId: string) {
        const gameContext = this.gameManager.getOrCreateRoom(roomId);
        const sockets = await this.server.in(roomId).fetchSockets();
        const currentStateName = gameContext.getCurrentStateName();
        const rawData = gameContext.roomData;

        this.logger.debug(`Broadcasting state for room ${roomId}: currentState=${currentStateName}, players=${rawData.players.length}`);

        for (const socket of sockets) {
            const playerId = socket.data.playerId;

            const sanitizedState = this.stateSerializer.serializeForPlayer(
                rawData,
                currentStateName,
                playerId
            );

            socket.emit('sync_state', sanitizedState);
        }

        // Check if it's a bot's turn
        // We do this after broadcast so clients see the state update first
        await this.botService.checkAndPlay(roomId, gameContext);
    }
}
