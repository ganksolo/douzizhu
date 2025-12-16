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

            // Check if all REAL players are offline for > 10 mins
            const allHumansOffline = realPlayers.every(p => !p.online);
            if (allHumansOffline) {
                const tenMinutesAgo = Date.now() - 600000;
                // Only act if ALL humans are abandoned
                const allAbandoned = realPlayers.every(p => p.lastActive < tenMinutesAgo);

                if (allAbandoned) {
                    this.logger.log(`Cleaning abandoned room ${roomId} (All humans offline > 10m)`);
                    await this.roomService.destroyRoom(roomId);
                }
            }
        }
    }
}
