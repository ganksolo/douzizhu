/**
 * InitState - Initial game state
 * Prepares the game for a new round
 */

import { BaseState } from '../BaseState';
import { GameStateEnum } from '../../GameStateEnum';
import type { AnyGameAction } from '../../GameAction';
import { GameActionType } from '../../GameAction';
import { eventBus, GameEvent } from '../../EventBus';

export class InitState extends BaseState {
    enter(_data?: any): void {
        this.log('Entering INIT state', _data);

        // Reset game data
        this.context.resetData();

        // Emit game start event
        eventBus.emit(GameEvent.GAME_START, {
            timestamp: Date.now(),
        });

        // Auto-transition to SHUFFLING after a brief delay
        setTimeout(() => {
            this.context.changeState(GameStateEnum.SHUFFLING);
        }, 100);
    }

    update(_deltaTime: number): void {
        // No ongoing logic in INIT state
    }

    exit(): void {
        this.log('Exiting INIT state');
    }

    validate(action: AnyGameAction): boolean {
        // Only allow START_GAME action in INIT state
        return action.type === GameActionType.START_GAME;
    }

    handleAction(action: AnyGameAction): void {
        if (action.type === GameActionType.START_GAME) {
            this.log('Starting game');
            this.context.changeState(GameStateEnum.SHUFFLING);
        }
    }

    getStateName(): string {
        return 'InitState';
    }
}
