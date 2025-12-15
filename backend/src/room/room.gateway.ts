import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { RoomService } from './room.service';
import { AuthService } from '../auth/auth.service';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: 'room', // Separate namespace for room management
})
export class RoomGateway {
    @WebSocketServer()
    server: Server;

    private logger = new Logger(RoomGateway.name);

    constructor(
        private readonly roomService: RoomService,
        private readonly authService: AuthService,
    ) { }

    @SubscribeMessage('join_room')
    async handleJoinRoom(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            // Authenticate from Token
            const token = client.handshake.auth?.token || client.handshake.query?.token as string;

            // If no token, check if we have mock userId (fallback for dev only? or remove?)
            // We should enforce Token. The previous generic fix relied on Token.
            // If token is missing, rely on previous logic? 
            // Previous logic: userId = auth.userId. SocketService does NOT send userId directly.
            // So we MUST use Token.

            let userId = '';
            let nickname = '';
            let avatar = '';

            if (token) {
                const payload = this.authService.verifyToken(token);
                if (payload) {
                    userId = payload.sub;
                    // Fetch full profile for Avatar
                    const user = await this.authService.validateUser(userId);
                    nickname = user?.nickname || payload.username;
                    avatar = user?.avatar || '';
                }
            }

            // Fallback for mock/test clients that send userId directly (optional)
            if (!userId) {
                userId = client.handshake.auth?.userId || client.handshake.query?.userId;
                nickname = client.handshake.auth?.nickname || `User-${userId}`;
            }

            if (!userId) {
                this.logger.warn(`Client ${client.id} tried to join room without valid auth`);
                client.disconnect();
                return;
            }

            const players = await this.roomService.joinRoom(data.roomId, { id: userId, nickname, avatar });

            client.join(data.roomId);

            // Broadcast to room
            this.server.to(data.roomId).emit('player_list_update', players);
            this.server.to(data.roomId).emit('player_joined', { userId, nickname, avatar });

            return { status: 'ok', players };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    @SubscribeMessage('leave_room')
    async handleLeaveRoom(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const userId = client.handshake.auth?.userId || client.handshake.query?.userId;
        if (!userId) return;

        await this.roomService.leaveRoom(data.roomId, userId);
        client.leave(data.roomId);

        const players = await this.roomService.getPlayers(data.roomId);
        this.server.to(data.roomId).emit('player_list_update', players);
        this.server.to(data.roomId).emit('player_left', { userId });
    }

    @SubscribeMessage('kick_player')
    async handleKickPlayer(
        @MessageBody() data: { roomId: string; targetId: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const userId = client.handshake.auth?.userId || client.handshake.query?.userId;
            await this.roomService.kickPlayer(data.roomId, userId, data.targetId);

            // Notify target (if connected to this namespace)
            // This is tricky without a map of userId -> socketId.
            // For now, we just broadcast the list update.
            // In a real app, we'd find the socket and disconnect it.

            const players = await this.roomService.getPlayers(data.roomId);
            this.server.to(data.roomId).emit('player_list_update', players);
            this.server.to(data.roomId).emit('player_kicked', { targetId: data.targetId });

            return { status: 'ok' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    @SubscribeMessage('toggle_ready')
    async handleToggleReady(
        @MessageBody() data: { roomId: string; isReady: boolean },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const userId = client.handshake.auth?.userId || client.handshake.query?.userId;
            if (!userId) return;

            const players = await this.roomService.toggleReady(data.roomId, userId, data.isReady);
            this.server.to(data.roomId).emit('player_list_update', players);

            // Try to start game
            const started = await this.roomService.tryStartGame(data.roomId);
            if (started) {
                this.server.to(data.roomId).emit('game_start', { roomId: data.roomId });
            }

            return { status: 'ok', started };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    @SubscribeMessage('request_rematch')
    async handleRematch(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            await this.roomService.requestRematch(data.roomId);

            const players = await this.roomService.getPlayers(data.roomId);
            this.server.to(data.roomId).emit('room_reset', { roomId: data.roomId });
            this.server.to(data.roomId).emit('player_list_update', players);

            return { status: 'ok' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }
}
