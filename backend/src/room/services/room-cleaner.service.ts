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

            // If empty, destroy immediately
            if (players.length === 0) {
                await this.roomService.destroyRoom(roomId);
                continue;
            }

            // Check if all offline for > 10 mins
            const allOffline = players.every(p => !p.online);
            if (allOffline) {
                const tenMinutesAgo = Date.now() - 600000;
                const allAbandoned = players.every(p => p.lastActive < tenMinutesAgo);

                if (allAbandoned) {
                    this.logger.log(`Cleaning abandoned room ${roomId}`);
                    await this.roomService.destroyRoom(roomId);
                }
            }
        }
    }
}
