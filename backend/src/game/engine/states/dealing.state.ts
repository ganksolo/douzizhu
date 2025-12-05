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
        context.roomData.startTime = new Date();
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
        // 2 Decks (108 Cards)
        const suits = ['♠', '♥', '♣', '♦'];
        const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
        const deck: string[] = [];

        // Generate 2 sets of standard cards + 2 sets of jokers
        for (let d = 0; d < 2; d++) {
            for (const suit of suits) {
                for (const rank of ranks) {
                    deck.push(`${suit}${rank}`);
                }
            }
            deck.push('BlackJoker');
            deck.push('RedJoker');
        }

        // Fisher-Yates shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        this.logger.log(`Deck shuffled with ${deck.length} cards (Expect 108).`);

        // Reserve 8 Bottom Cards
        const bottomCards = deck.splice(deck.length - 8, 8);
        context.roomData.bottomCards = bottomCards;
        this.logger.log(`Reserved 8 bottom cards: ${bottomCards.join(',')}`);

        // Deal 25 cards to each of the 4 players
        // Ensure players are sorted by seatIndex (0-3) for consistent dealing
        context.roomData.players.sort((a, b) => a.seatIndex - b.seatIndex);

        if (context.roomData.players.length !== 4) {
            this.logger.error(`Invalid player count: ${context.roomData.players.length}. Expected 4.`);
            // Fallback or Error handling? For now, just deal round-robin or as is.
        }

        // Distribute remaining 100 cards
        // Method A: Deal 25 blocks (simple)
        // Method B: Round-robin (traditional) - let's do 25 blocks for simplicity unless asked otherwise.
        // User asked "100 cards in order distribute to Seat 0-3". So 25 each.

        for (let i = 0; i < 4; i++) {
            // 100 cards total in deck now.
            // Seat 0 gets 0-24, Seat 1 gets 25-49, etc.
            const hand = deck.splice(0, 25);
            if (context.roomData.players[i]) {
                context.roomData.players[i].hand = hand;
                context.roomData.players[i].handCount = 25;
                this.logger.log(`Dealt 25 cards to Seat ${i} (${context.roomData.players[i].name})`);
            }
        }

        // Note: Main deck in context.roomData.deck is now empty (or should be cleared if logic differs)
        context.roomData.deck = []; // Clear main deck
    }
}
