import { Module } from '@nestjs/common';
import { GameContext } from './engine/game-context';
import { InitState } from './engine/states/init.state';
import { DealingState } from './engine/states/dealing.state';
import { PlayingState } from './engine/states/playing.state';

import { GameRedisService } from './services/game-redis.service';
import { GameGateway } from './gateway/game.gateway';
import { StateSerializer } from './services/state-serializer.service';
import { GameManagerService } from './services/game-manager.service';

@Module({
    providers: [
        GameContext,
        GameRedisService,
        GameManagerService,
        GameGateway,
        StateSerializer,
        InitState,
        DealingState,
        PlayingState,
    ],
    exports: [GameContext, GameManagerService],
})
export class GameModule { }
