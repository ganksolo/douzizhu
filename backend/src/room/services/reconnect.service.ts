import { Injectable, Logger } from '@nestjs/common';
import { RoomService } from '../room.service';

@Injectable()
export class ReconnectService {
    private logger = new Logger(ReconnectService.name);

    constructor(private roomService: RoomService) { }

    async handleDisconnect(roomId: string, userId: string): Promise<void> {
        this.logger.log(`Player ${userId} disconnected from room ${roomId}`);
        await this.roomService.setPlayerOnline(roomId, userId, false);
    }

    async handleReconnect(roomId: string, userId: string): Promise<boolean> {
        this.logger.log(`Player ${userId} reconnected to room ${roomId}`);
        await this.roomService.setPlayerOnline(roomId, userId, true);

        // Check if game is playing
        const meta = await this.roomService.getRoomMeta(roomId);
        return meta?.status === 'playing';
    }
}
