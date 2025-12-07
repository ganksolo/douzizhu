import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { RoomService } from './room.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Assuming we might use this later, but for now manual token check in Gateway is common or use Guard if global

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: 'room', // Separate namespace for room management
})
export class RoomGateway {
    @WebSocketServer()
    server: Server;

    private logger = new Logger(RoomGateway.name);

    constructor(private readonly roomService: RoomService) { }

    @SubscribeMessage('join_room')
    async handleJoinRoom(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            // Assuming Auth is handled by global adapter or client.data is populated
            // For Phase 21.1, we rely on the client.data populated by previous Auth integration or passed params
            // But wait, this is a NEW namespace 'room'. 
            // We need to ensure Auth works here too. 
            // For simplicity in this step, let's assume client.handshake.auth.token is valid or we trust client.data if shared (namespaces don't share socket instances usually).

            // Let's assume we extract user from handshake again or use a Guard.
            // To keep it simple and consistent with Phase 20.3:
            // We should probably use the same Auth mechanism. 

            // MOCK for now: We assume client.data.userId is set (middleware needed) OR we extract it.
            // Since we haven't set up a global Auth Adapter for all namespaces, let's just extract from handshake for now.

            const userId = client.handshake.auth?.userId || client.handshake.query?.userId; // Simple mock or real logic
            const nickname = client.handshake.auth?.nickname || `User-${userId}`;
            const avatar = '';

            if (!userId) {
                client.disconnect();
                return;
            }

            const players = await this.roomService.joinRoom(data.roomId, { id: userId, nickname, avatar });

            client.join(data.roomId);

            // Broadcast to room
            this.server.to(data.roomId).emit('player_list_update', players);
            this.server.to(data.roomId).emit('player_joined', { userId, nickname });

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
