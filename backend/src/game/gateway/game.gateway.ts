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
import { HintService } from '../services/hint.service';
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
        private hintService: HintService,
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

                // Issue #PVE-Cleanup: Pause PVE rooms if no human players are online
                // Only applies to PVE rooms to avoid affecting PVP flows
                // Debug logging to verify values
                // this.logger.debug(`Room ${roomId}: type=${context.roomData.gameType}, players=${context.roomData.players.length}`);

                if (context.roomData.gameType === 'PVE') {
                    const hasOnlineHumans = context.roomData.players.some(p => !p.isRobot && p.online);
                    if (!hasOnlineHumans && context.roomData.players.length > 0) {
                        // Skip update for this room -> effectively pauses AI
                        this.logger.debug(`PVE Room ${roomId} paused (no online humans)`);
                        continue;
                    }
                } else {
                    // Fallback: If not marked PVE but has bots?
                    // Some users might create PVP room and add bots.
                    // If ONLY bots are in the room (or human is offline), we should probably pause too.
                    const botCount = context.roomData.players.filter(p => p.isRobot).length;
                    if (botCount > 0) {
                        const hasOnlineHumans = context.roomData.players.some(p => !p.isRobot && p.online);
                        if (!hasOnlineHumans) {
                            this.logger.debug(`Hybrid/PVP Room ${roomId} with bots paused (no online humans)`);
                            continue;
                        }
                    }
                }

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

            // Mark offline in Game Context
            const context = this.gameManager.getOrCreateRoom(roomId);
            const player = context.roomData.players.find(p => p.id === userId);
            if (player) {
                player.online = false;
                this.logger.log(`Player ${userId} marked offline in GameContext ${roomId}`);
            }
        }
    }

    @SubscribeMessage('join_game')
    async handleJoinGame(client: Socket, payload: { roomId: string }) {
        const { roomId } = payload;
        const userId = client.data.userId;

        // Join Socket Room
        client.join(roomId);
        client.data.roomId = roomId;

        this.logger.log(`Player ${userId} joined game channel ${roomId}`);

        // Initialize Game Context if needed for state syncing
        const gameContext = this.gameManager.getOrCreateRoom(roomId);
        if (!gameContext.onStateChange) {
            gameContext.onStateChange = (rid) => this.broadcastState(rid);
        }

        // Mark online in Game Context
        const player = gameContext.roomData.players.find(p => p.id === userId);
        if (player) {
            player.online = true;
            this.logger.log(`Player ${userId} marked online in GameContext ${roomId}`);
        }

        // Sync GameState
        await this.broadcastState(roomId);

        // Return success
        return { status: 'ok', roomId };
    }

    @SubscribeMessage('join_room')
    async handleJoinRoom(
        @MessageBody() data: { roomId: string; mode?: 'observe' | 'play' },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const { roomId, mode = 'play' } = data;
            const playerId = client.data.userId;
            const username = client.data.username;

            if (!playerId) {
                throw new Error('User not authenticated');
            }

            client.join(roomId);
            client.data.roomId = roomId;
            client.data.playerId = playerId;

            this.logger.log(`Player ${username} (${playerId}) joined room ${roomId} (mode: ${mode})`);

            let players;
            if (mode === 'observe') {
                // Observer mode: just get player list, don't sit down
                players = await this.roomService.getPlayers(roomId);
            } else {
                // Play mode: auto-sit (default behavior)
                // Fetch User Details (Coins & Avatar)
                const user = await this.authService.validateUser(playerId);
                const coins = user?.coins !== undefined ? user.coins : 1000;
                const userAvatar = user?.avatar || '';

                players = await this.roomService.joinRoom(roomId, {
                    id: playerId,
                    nickname: username,
                    avatar: userAvatar,
                    coins: coins
                });
            }

            // 2. Broadcast updated list to room with config
            const meta = await this.roomService.getRoomMeta(roomId);
            const config = meta?.config ? JSON.parse(meta.config) : {};
            this.server.to(roomId).emit('player_list_update', { roomId, players, config });

            // Broadcast specific join event only if actually seated
            if (mode === 'play') {
                this.server.to(roomId).emit('player_joined', {
                    userId: playerId,
                    username: username
                });
            }

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

    @SubscribeMessage('sit_down')
    async handleSitDown(
        @MessageBody() data: { roomId: string; seatIndex: number },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const { roomId, seatIndex } = data;
            const playerId = client.data.userId;
            const username = client.data.username;

            if (!playerId) {
                throw new Error('User not authenticated');
            }

            this.logger.log(`Player ${username} (${playerId}) sitting at seat ${seatIndex} in room ${roomId}`);

            // Sit in specific seat
            const players = await this.roomService.joinRoom(roomId, {
                id: playerId,
                nickname: username,
                avatar: ''
            }, seatIndex);

            // Broadcast updates with config
            const meta = await this.roomService.getRoomMeta(roomId);
            const config = meta?.config ? JSON.parse(meta.config) : {};
            this.server.to(roomId).emit('player_list_update', { roomId, players, config });
            this.server.to(roomId).emit('player_joined', {
                userId: playerId,
                username: username,
                seat: seatIndex
            });

        } catch (error) {
            this.logger.error(`Error in sit_down: ${error.message}`);
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

            // Issue #46 Fix: Ensure onStateChange is set BEFORE toggleReady
            // because PVE auto-start in toggleReady may trigger tryStartGame() immediately
            const gameContext = this.gameManager.getOrCreateRoom(roomId);
            if (!gameContext.onStateChange) {
                gameContext.onStateChange = (rid) => this.broadcastState(rid);
            }

            const result = await this.roomService.toggleReady(roomId, playerId, targetState);
            const { players, addedBots } = result;

            // Broadcast player list update with config
            const meta = await this.roomService.getRoomMeta(roomId);
            const config = meta?.config ? JSON.parse(meta.config) : {};
            this.server.to(roomId).emit('player_list_update', { roomId, players: result.players, config });

            // Broadcast individual player_joined events for auto-added bots
            if (addedBots && addedBots.length > 0) {
                for (const bot of addedBots) {
                    this.server.to(roomId).emit('player_joined', {
                        userId: bot.userId,
                        username: bot.nickname,
                        isBot: true,
                        seat: bot.seat
                    });
                }
            }

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

    /**
     * Issue #32: Handle hint request from player
     */
    @SubscribeMessage('request_hint')
    async handleRequestHint(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const { roomId } = data;
            const playerId = client.data.userId;

            this.logger.log(`Hint requested by ${playerId} in room ${roomId}`);

            const gameContext = this.gameManager.getOrCreateRoom(roomId);
            const result = this.hintService.getHint(gameContext, playerId);

            this.logger.log(`Sending hint_result to ${playerId}: ${JSON.stringify(result.suggestedCards)}`);
            client.emit('hint_result', { cards: result.suggestedCards });
        } catch (error) {
            this.logger.error(`Error in request_hint: ${error.message}`);
            client.emit('hint_result', { cards: [], error: error.message });
        }
    }

    /**
     * Issue #34: Handle rematch request (Play Again)
     */
    @SubscribeMessage('request_rematch')
    async handleRematch(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const { roomId } = data;
            this.logger.log(`Rematch requested for room ${roomId}`);

            // Reset game state via RoomService
            await this.roomService.requestRematch(roomId);

            // Broadcast room reset to all players
            this.server.to(roomId).emit('room_reset', { roomId });

            // Get updated player list and broadcast
            const players = await this.roomService.getPlayers(roomId);
            this.server.to(roomId).emit('player_list_update', { roomId, players });

            client.emit('rematch_success', { roomId });
        } catch (error) {
            this.logger.error(`Error in request_rematch: ${error.message}`);
            client.emit('rematch_error', { error: error.message });
        }
    }

    /**
     * Room Chat: Handle chat message from player
     */
    @SubscribeMessage('chat_send')
    async handleChatSend(
        @MessageBody() data: { roomId: string; text: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const { roomId: payloadRoomId, text } = data;
            const userId = client.data.userId;
            const username = client.data.username;

            // Use stored roomId if available, otherwise use payload roomId
            // This makes chat more robust when client.data.roomId wasn't set properly
            const roomId = client.data.roomId || payloadRoomId;

            this.logger.log(`[Chat] Received chat_send from ${username} (${userId}). Payload roomId: ${payloadRoomId}, client.data.roomId: ${client.data.roomId}, using: ${roomId}`);

            // Validate roomId exists
            if (!roomId) {
                this.logger.warn(`[Chat] Rejected: No room ID available`);
                client.emit('chat_error', { message: 'Room ID required' });
                return;
            }

            // Validate text length (1-200)
            if (!text || text.length < 1 || text.length > 200) {
                this.logger.warn(`[Chat] Rejected: Invalid message length (${text?.length})`);
                client.emit('chat_error', { message: 'Message must be 1-200 characters' });
                return;
            }

            // Ensure client is in the socket room (join if not already)
            const rooms = Array.from(client.rooms);
            this.logger.log(`[Chat] Client ${client.id} current rooms: ${JSON.stringify(rooms)}`);

            if (!rooms.includes(roomId)) {
                this.logger.warn(`[Chat] Client not in socket room, joining: ${roomId}`);
                client.join(roomId);
                client.data.roomId = roomId;
            }

            // Broadcast to room
            this.logger.log(`[Chat] Broadcasting chat_message to room ${roomId}`);
            this.server.to(roomId).emit('chat_message', {
                senderId: userId,
                senderName: username,
                text: text,
                timestamp: Date.now()
            });

            this.logger.log(`[Chat] ✅ Broadcast complete for "${text.substring(0, 20)}..."`);
        } catch (error) {
            this.logger.error(`Error in chat_send: ${error.message}`);
            client.emit('chat_error', { message: 'Failed to send message' });
        }
    }

    /**
     * Issue #PVE-Cleanup: Handle explicit leave_room event from frontend
     * This is triggered when user navigates away (browser back, etc.)
     */
    @SubscribeMessage('leave_room')
    async handleLeaveRoom(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const { roomId } = data;
            const userId = client.data.userId;

            if (!userId || !roomId) {
                return;
            }

            this.logger.log(`Player ${userId} leaving room ${roomId} (explicit leave_room event)`);

            // Leave socket room
            client.leave(roomId);
            client.data.roomId = undefined;

            // Mark offline in Room Service (Redis)
            await this.roomService.setPlayerOnline(roomId, userId, false);

            // Mark offline in Game Context (memory)
            const context = this.gameManager.getOrCreateRoom(roomId);
            const player = context.roomData.players.find(p => p.id === userId);
            if (player) {
                player.online = false;
                this.logger.log(`Player ${userId} marked offline in GameContext ${roomId}`);
            }

            // Broadcast updated player list
            const players = await this.roomService.getPlayers(roomId);
            this.server.to(roomId).emit('player_list_update', { roomId, players });
            this.server.to(roomId).emit('player_left', { userId });

        } catch (error) {
            this.logger.error(`Error in leave_room: ${error.message}`);
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

            // Debug: Check if lastPlayedCards is in serialized state
            this.logger.debug(`[broadcastState] Serialized for ${playerId}: lastPlayedCards=${JSON.stringify(sanitizedState.lastPlayedCards)}`);

            socket.emit('sync_state', sanitizedState);
        }

        // Issue #PVE-Cleanup: Skip bot actions if no human players are online
        // This mirrors the game loop pause logic to prevent AI from acting when humans disconnect
        const hasOnlineHumans = rawData.players.some(p => !p.isRobot && p.online);
        if (!hasOnlineHumans && rawData.players.length > 0) {
            this.logger.debug(`PVE Room ${roomId}: Skipping bot actions in broadcastState (no online humans)`);
            return;
        }

        // Check if it's a bot's turn (Phase 35: includes BiddingState)
        // We do this after broadcast so clients see the state update first
        // Pass broadcast callback to allow AI to trigger re-broadcast after action
        await this.botService.checkAndPlay(roomId, gameContext, async () => {
            await this.broadcastState(roomId);
        });
    }
}
