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
import { UserAction } from '../types/game.types';

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
        // In a real app, we would parse token from query params here
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join_room')
    async handleJoinRoom(
        @MessageBody() data: { roomId: string; playerId: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const { roomId, playerId } = data;
            client.join(roomId);
            client.data.playerId = playerId;
            client.data.roomId = roomId;
            this.logger.log(`Player ${playerId} joined room ${roomId}`);

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
                    name: playerId,
                    hand: [],
                    isReady: true
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
        this.logger.log(`Received action ${action.type} from ${action.playerId} in room ${roomId}`);

        try {
            const gameContext = this.gameManager.getOrCreateRoom(roomId);

            // 1. Execute Logic
            gameContext.handleInput(action);

            // 2. Save State
            await gameContext.saveSnapshot();

            // 3. Broadcast Sanitized State
            await this.broadcastState(roomId);

        } catch (error) {
            this.logger.error(`Error processing action: ${error.message}`);
            client.emit('error', { message: 'Internal Server Error' });
        }
    }

    private async broadcastState(roomId: string) {
        const gameContext = this.gameManager.getOrCreateRoom(roomId);
        const sockets = await this.server.in(roomId).fetchSockets();
        const currentStateName = gameContext.getCurrentStateName();
        const rawData = gameContext.roomData;

        this.logger.debug(`Broadcasting state for room ${roomId}: currentState=${currentStateName}, players=${rawData.players.length}`);

        for (const socket of sockets) {
            // We need to know which playerId this socket belongs to.
            // In a real app, this is mapped during connection/auth.
            // For this demo, we'll assume the client sent their playerId in join_room and we stored it in socket.data
            // But since we didn't implement that fully, let's try to find playerId from roomData based on some logic or just skip if unknown.

            // Ideally: socket.data.playerId
            // Let's assume we have a way to get playerId. For now, I'll iterate room players and match? No, that doesn't work.
            // Let's assume the client sends a 'request_state' or we stored it.

            // Simplified: We just broadcast to everyone, but we need to know WHO they are to sanitize.
            // If we can't identify them, we can't sanitize properly (or we treat them as observer).

            // Hack for demo: We will assume socket.handshake.query.playerId exists or similar.
            // Let's assume socket.data.playerId was set in handleJoinRoom (we need to update that).

            const playerId = socket.data.playerId;

            const sanitizedState = this.stateSerializer.serializeForPlayer(
                rawData,
                currentStateName,
                playerId
            );

            socket.emit('sync_state', sanitizedState);
        }
    }
}
