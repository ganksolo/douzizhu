import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { BaseState } from '../base-state';
import { GameContext } from '../game-context';
import { PlayingState } from './playing.state';
import { UserAction } from '../../types/game.types';

@Injectable()
export class DealingState extends BaseState {
    private logger = new Logger(DealingState.name);

    constructor(
        @Inject(forwardRef(() => PlayingState))
        private playingState: PlayingState,
    ) {
        super();
    }

    enter(context: GameContext): void {
        this.logger.log('Entering DealingState. Shuffling deck...');
        this.shuffleDeck(context);
    }

    handleInput(context: GameContext, action: UserAction): void {
        this.logger.warn(`Input ignored in DealingState: ${action.type}`);
    }

    update(context: GameContext, deltaTime: number): void {
        // Simulate dealing animation time, then transition
        this.logger.log('Dealing complete. Transitioning to PlayingState...');
        context.transitionTo(this.playingState);
    }

    exit(context: GameContext): void {
        this.logger.log('Exiting DealingState.');
    }

    private shuffleDeck(context: GameContext) {
        // Simple shuffle logic for demonstration
        const suits = ['♠', '♥', '♣', '♦'];
        const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
        const deck: string[] = [];

        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push(`${suit}${rank}`);
            }
        }
        deck.push('BlackJoker');
        deck.push('RedJoker');

        // Fisher-Yates shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        context.roomData.deck = deck;
        this.logger.log(`Deck shuffled with ${deck.length} cards.`);
    }
}
