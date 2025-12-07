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
            // Use authenticated userId
            const playerId = client.data.userId;
            const username = client.data.username;

            if (!playerId) {
                throw new Error('User not authenticated');
            }

            client.join(roomId);
            client.data.roomId = roomId;
            // client.data.playerId is already set as userId, but let's keep consistency if needed
            client.data.playerId = playerId;

            this.logger.log(`Player ${username} (${playerId}) joined room ${roomId}`);

            // Handle Reconnect Logic
            await this.reconnectService.handleReconnect(roomId, playerId);

            const gameContext = this.gameManager.getOrCreateRoom(roomId);

            // Setup state change callback first
            if (!gameContext.onStateChange) {
                gameContext.onStateChange = (rid) => this.broadcastState(rid);
            }

            // Try to restore from Redis first
            await gameContext.loadSnapshot(roomId);

            // If no state exists (new room or failed restore), initialize
            if (!gameContext.currentState) {
                this.logger.debug(`Initializing new game for room ${roomId}`);
                gameContext.roomData.roomId = roomId;
                gameContext.initialize();
                this.logger.debug(`After initialize: currentState = ${gameContext.getCurrentStateName()}`);
                // Manually trigger state transitions to ensure state is set immediately
                // InitState.update() will transition to DealingState
                gameContext.update(0.01);
                this.logger.debug(`After first update: currentState = ${gameContext.getCurrentStateName()}`);
                // DealingState.update() will transition to PlayingState  
                gameContext.update(0.01);
                this.logger.debug(`After second update: currentState = ${gameContext.getCurrentStateName()}`);
            } else {
                this.logger.debug(`Room ${roomId} already initialized, currentState = ${gameContext.getCurrentStateName()}`);
            }

            // Add player if not exists
            const existingPlayer = gameContext.roomData.players.find(p => p.id === playerId);
            if (!existingPlayer) {
                gameContext.roomData.players.push({
                    id: playerId,
                    name: username || `User-${playerId}`,
                    hand: [],
                    isReady: true,
                    seatIndex: -1
                });
                await gameContext.saveSnapshot();
            }

            // Always broadcast latest state when someone joins
            await this.broadcastState(roomId);
        } catch (error) {
            this.logger.error(`Error in join_room: ${error.message}`);
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
