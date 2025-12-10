import { Module, forwardRef } from '@nestjs/common';
import { GameContext } from './engine/game-context';
import { InitState } from './engine/states/init.state';
import { DealingState } from './engine/states/dealing.state';
import { BiddingState } from './engine/states/bidding.state';
import { PlayingState } from './engine/states/playing.state';

import { GameRedisService } from './services/game-redis.service';
import { GameGateway } from './gateway/game.gateway';
import { StateSerializer } from './services/state-serializer.service';
import { GameManagerService } from './services/game-manager.service';
import { RulesService } from './services/rules.service';
import { MoveValidator } from './rules/move-validator';
import { AIService } from './services/ai.service';
import { DecisionEngine } from './engine/ai/decision-engine';
import { BidEvaluator } from './engine/ai/bid-evaluator';
import { InputNormalizer } from './engine/action-pipeline/input-normalizer';
import { ActionPipelineService } from './engine/action-pipeline/action-pipeline.service';
import { TurnManager } from './engine/turn-manager';
import { PlayActionHandler } from './engine/action-handlers/play-handler';
import { PassActionHandler } from './engine/action-handlers/pass-handler';
import { BidActionHandler } from './engine/action-handlers/bid-handler';
import { MatchService } from './services/match.service';
import { GameEndState } from './engine/states/game-end.state';
import { AuthModule } from '../auth/auth.module';
import { RoomModule } from '../room/room.module';
import { MatchModule } from './match/match.module';
import { BotService } from './bot.service';

@Module({
    imports: [
        AuthModule,
        forwardRef(() => RoomModule),
        MatchModule,
    ],
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
        BidEvaluator,
        InitState,
        DealingState,
        BiddingState,
        PlayingState,
        GameEndState,
        InputNormalizer,
        ActionPipelineService,
        TurnManager,
        PlayActionHandler,
        PassActionHandler,
        BidActionHandler,
        MatchService,
        BotService,
    ],
    exports: [GameContext, GameManagerService, RulesService, AIService, BotService, GameGateway],
})
export class GameModule { }

