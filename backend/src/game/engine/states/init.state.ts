import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { BaseState } from '../base-state';
import { GameContext } from '../game-context';
import { DealingState } from './dealing.state';
import { UserAction } from '../../types/game.types';

@Injectable()
export class InitState extends BaseState {
    private logger = new Logger(InitState.name);

    constructor(
        @Inject(forwardRef(() => DealingState))
        private dealingState: DealingState,
    ) {
        super();
    }

    enter(context: GameContext): void {
        this.logger.log('Initializing game data...');
        // Reset room data
        context.roomData.deck = [];
        context.roomData.currentTurn = undefined;
        context.roomData.lastPlayedCards = undefined;

        this.logger.log('Game initialized.');
    }

    handleInput(context: GameContext, action: UserAction): void {
        this.logger.warn(`Input ignored in InitState: ${action.type}`);
    }

    update(context: GameContext, deltaTime: number): void {
        // Automatically transition to DealingState
        this.logger.log('Auto-transitioning to DealingState...');
        context.transitionTo(this.dealingState);
    }

    exit(context: GameContext): void {
        this.logger.log('Exiting InitState.');
    }
}
