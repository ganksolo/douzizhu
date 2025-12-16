import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RoomService } from '../room.service';

@Injectable()
export class RoomCleanerService {
    private logger = new Logger(RoomCleanerService.name);

    constructor(private roomService: RoomService) { }

    @Cron(CronExpression.EVERY_MINUTE)
    async cleanAbandonedRooms() {
        const roomIds = await this.roomService.getAllRoomIds();
        for (const roomId of roomIds) {
            const players = await this.roomService.getPlayers(roomId);

            // If empty or ONLY bots, destroy immediately
            const realPlayers = players.filter(p => !p.isBot);
            if (realPlayers.length === 0) {
                this.logger.log(`Cleaning empty/bot-only room ${roomId}`);
                await this.roomService.destroyRoom(roomId);
                continue;
            }

            // Check if all REAL players are offline for > 1 min
            const allHumansOffline = realPlayers.every(p => !p.online);
            if (allHumansOffline) {
                const oneMinuteAgo = Date.now() - 60000;
                // Only act if ALL humans are abandoned
                const allAbandoned = realPlayers.every(p => p.lastActive < oneMinuteAgo);

                if (allAbandoned) {
                    this.logger.log(`Cleaning abandoned room ${roomId} (All humans offline > 1m)`);
                    await this.roomService.destroyRoom(roomId);
                }
            }
        }
    }
}
