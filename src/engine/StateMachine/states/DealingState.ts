/**
 * DealingState - Card dealing animation state
 * Gradually deals cards to players and transitions to CALL_LANDLORD when complete
 */

import { BaseState } from '../BaseState';
import { GameStateEnum } from '../../GameStateEnum';
import type { AnyGameAction } from '../../GameAction';
import { eventBus, GameEvent } from '../../EventBus';
import { dealCards } from '../../../utils/deck';

export class DealingState extends BaseState {
    private dealInterval = 50; // Deal a card every 50ms
    private elapsedTime = 0;
    private cardsDealt = 0;
    private totalCardsPerPlayer = 25; // 100 cards / 4 players = 25 each

    enter(_data?: any): void {
        this.log('Entering DEALING state');

        // Deal all cards at once (backend logic)
        const { hands, bottomCards } = dealCards(this.context.data.deck);

        // Store in context
        this.context.data.bottomCards = bottomCards;

        // Initialize players if not already done
        if (this.context.data.players.length === 0) {
            this.context.data.players = [
                { id: 'player-0', name: 'You', hand: hands[0], role: 'peasant', isAutoPlay: false, isAI: false },
                { id: 'player-1', name: 'AI 1', hand: hands[1], role: 'peasant', isAutoPlay: true, isAI: true },
                { id: 'player-2', name: 'AI 2', hand: hands[2], role: 'peasant', isAutoPlay: true, isAI: true },
                { id: 'player-3', name: 'AI 3', hand: hands[3], role: 'peasant', isAutoPlay: true, isAI: true },
            ];
        } else {
            // Update hands
            this.context.data.players.forEach((player, index) => {
                player.hand = hands[index];
            });
        }

        this.elapsedTime = 0;
        this.cardsDealt = 0;
    }

    update(deltaTime: number): void {
        this.elapsedTime += deltaTime;

        // Calculate how many cards should be dealt by now
        const targetCardsDealt = Math.floor(this.elapsedTime / this.dealInterval);

        // Emit events for newly dealt cards
        while (this.cardsDealt < targetCardsDealt && this.cardsDealt < this.totalCardsPerPlayer * 4) {
            const playerIndex = this.cardsDealt % 4;
            eventBus.emit(GameEvent.CARD_DEALT, {
                playerId: this.context.data.players[playerIndex].id,
                cardCount: Math.floor(this.cardsDealt / 4) + 1,
            });
            this.cardsDealt++;
        }

        // Check if all cards are dealt
        if (this.cardsDealt >= this.totalCardsPerPlayer * 4) {
            this.log('All cards dealt, transitioning to CALL_LANDLORD');
            this.context.changeState(GameStateEnum.CALL_LANDLORD);
        }
    }

    exit(): void {
        this.log('Exiting DEALING state');
    }

    validate(_action: AnyGameAction): boolean {
        // No player actions allowed during dealing
        return false;
    }

    handleAction(action: AnyGameAction): void {
        this.error('No actions allowed during dealing', action);
    }

    getStateName(): string {
        return 'DealingState';
    }
}
