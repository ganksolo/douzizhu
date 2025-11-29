import { Injectable, Logger } from '@nestjs/common';
import { GameContext } from '../engine/game-context';
import { GameRedisService } from './game-redis.service';
import { InitState } from '../engine/states/init.state';
import { DealingState } from '../engine/states/dealing.state';
import { PlayingState } from '../engine/states/playing.state';

@Injectable()
export class GameManagerService {
    private rooms = new Map<string, GameContext>();
    private logger = new Logger(GameManagerService.name);

    constructor(
        private redisService: GameRedisService,
        private initState: InitState,
        private dealingState: DealingState,
        private playingState: PlayingState,
    ) { }

    getOrCreateRoom(roomId: string): GameContext {
        if (!this.rooms.has(roomId)) {
            this.logger.log(`Creating new game context for room ${roomId}`);
            const context = new GameContext(
                this.redisService,
                this.initState,
                this.dealingState,
                this.playingState,
            );
            context.roomData.roomId = roomId;
            this.rooms.set(roomId, context);
        }
        return this.rooms.get(roomId)!;
    }

    removeRoom(roomId: string): void {
        this.rooms.delete(roomId);
        this.logger.log(`Removed room ${roomId}`);
    }

    getAllRooms(): string[] {
        return Array.from(this.rooms.keys());
    }
}
