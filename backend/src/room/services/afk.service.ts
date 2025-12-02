import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RoomService } from '../room.service';
import { RoomGateway } from '../room.gateway';

@Injectable()
export class AFKService {
    private logger = new Logger(AFKService.name);

    constructor(
        private roomService: RoomService,
        @Inject(forwardRef(() => RoomGateway))
        private roomGateway: RoomGateway,
    ) { }

    async updateActivity(roomId: string, userId: string) {
        await this.roomService.updateLastActive(roomId, userId);
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async checkAFK() {
        const roomIds = await this.roomService.getAllRoomIds();
        for (const roomId of roomIds) {
            const players = await this.roomService.getPlayers(roomId);
            for (const player of players) {
                if (!player.online) continue;

                const inactiveTime = Date.now() - player.lastActive;

                // 90s -> Kick
                if (inactiveTime > 90000) {
                    this.logger.log(`Kicking AFK player ${player.userId} from room ${roomId}`);
                    try {
                        await this.roomService.kickPlayer(roomId, 'system', player.userId);
                        // Notify room
                        this.roomGateway.server.to(roomId).emit('player_kicked', { targetId: player.userId, reason: 'AFK' });
                        const updatedPlayers = await this.roomService.getPlayers(roomId);
                        this.roomGateway.server.to(roomId).emit('player_list_update', updatedPlayers);
                    } catch (e) {
                        this.logger.error(`Failed to kick AFK player: ${e.message}`);
                    }
                }
                // 30s -> Warn
                else if (inactiveTime > 30000) {
                    this.roomGateway.server.to(roomId).emit('player_afk', { userId: player.userId });
                }
            }
        }
    }
}
