import { Module } from '@nestjs/common';
import { GameContext } from './engine/game-context';
import { InitState } from './engine/states/init.state';
import { DealingState } from './engine/states/dealing.state';
import { PlayingState } from './engine/states/playing.state';

import { GameRedisService } from './services/game-redis.service';
import { GameGateway } from './gateway/game.gateway';
import { StateSerializer } from './services/state-serializer.service';
import { GameManagerService } from './services/game-manager.service';
import { RulesService } from './services/rules.service';
import { MoveValidator } from './rules/move-validator';
import { AIService } from './services/ai.service';
import { DecisionEngine } from './engine/ai/decision-engine';
import { InputNormalizer } from './engine/action-pipeline/input-normalizer';
import { ActionPipelineService } from './engine/action-pipeline/action-pipeline.service';
import { TurnManager } from './engine/turn-manager';
import { PlayActionHandler } from './engine/action-handlers/play-handler';
import { PassActionHandler } from './engine/action-handlers/pass-handler';

@Module({
    providers: [
        GameContext,
        GameRedisService,
        GameManagerService,
        GameGateway,
        StateSerializer,
        RulesService,
        MoveValidator,
        AIService,
        DecisionEngine,
        InitState,
        DealingState,
        PlayingState,
        InputNormalizer,
        ActionPipelineService,
        TurnManager,
        PlayActionHandler,
        PassActionHandler,
    ],
    exports: [GameContext, GameManagerService, RulesService, AIService],
})
export class GameModule { }
