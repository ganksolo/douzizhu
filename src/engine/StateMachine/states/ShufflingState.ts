/**
 * ShufflingState - Deck shuffling animation state
 * Transitions to DEALING after shuffle animation completes
 */

import { BaseState } from '../BaseState';
import { GameStateEnum } from '../../GameStateEnum';
import type { AnyGameAction } from '../../GameAction';
import { createDeck, shuffleDeck } from '../../../utils/deck';

export class ShufflingState extends BaseState {
    private shuffleDuration = 1000; // 1 second
    private elapsedTime = 0;

    enter(_data?: any): void {
        this.log('Entering SHUFFLING state');

        // Create and shuffle deck
        const deck = createDeck();
        this.context.data.deck = shuffleDeck(deck);

        this.elapsedTime = 0;
    }

    update(deltaTime: number): void {
        this.elapsedTime += deltaTime;

        // Check if shuffle animation is complete
        if (this.elapsedTime >= this.shuffleDuration) {
            this.log('Shuffle complete, transitioning to DEALING');
            this.context.changeState(GameStateEnum.DEALING);
        }
    }

    exit(): void {
        this.log('Exiting SHUFFLING state');
    }

    validate(_action: AnyGameAction): boolean {
        // No actions allowed during shuffling
        return false;
    }

    handleAction(action: AnyGameAction): void {
        // No actions to handle
        this.error('No actions allowed during shuffling', action);
    }

    getStateName(): string {
        return 'ShufflingState';
    }
}
