/**
 * PlayingState - Main game playing phase
 * Core game logic: validate plays, handle turns, check win conditions
 */

import { BaseState } from '../BaseState';
import { GameStateEnum } from '../../GameStateEnum';
import type { AnyGameAction, PlayCardsAction, PassTurnAction } from '../../GameAction';
import { GameActionType } from '../../GameAction';
import { eventBus, GameEvent } from '../../EventBus';
import { getHandType, canBeat } from '../../../utils/rules';

export class PlayingState extends BaseState {
    private passCount = 0;

    enter(_data?: any): void {
        this.log('Entering PLAYING state');

        // Reset play state
        this.passCount = 0;
        this.context.data.lastPlayedCards = null;

        // Emit turn change
        const currentPlayer = this.context.data.players[this.context.data.currentTurn];
        eventBus.emit(GameEvent.TURN_CHANGE, {
            playerId: currentPlayer.id,
        });
    }

    update(_deltaTime: number): void {
        // Could add timer logic here for turn timeout
    }

    exit(): void {
        this.log('Exiting PLAYING state');
    }

    validate(action: AnyGameAction): boolean {
        const currentPlayer = this.context.data.players[this.context.data.currentTurn];

        // Check if action is from current turn player
        if (action.playerId !== currentPlayer.id) {
            this.error('Not current player\'s turn', action.playerId, currentPlayer.id);
            return false;
        }

        // Validate specific action types
        if (action.type === GameActionType.PLAY_CARDS) {
            return this.validatePlayCards(action as PlayCardsAction);
        } else if (action.type === GameActionType.PASS_TURN) {
            return this.validatePass(action as PassTurnAction);
        }

        return false;
    }

    handleAction(action: AnyGameAction): void {
        if (action.type === GameActionType.PLAY_CARDS) {
            this.handlePlayCards(action as PlayCardsAction);
        } else if (action.type === GameActionType.PASS_TURN) {
            this.handlePass(action as PassTurnAction);
        }
    }

    private validatePlayCards(action: PlayCardsAction): boolean {
        const cards = action.payload.cards;

        if (cards.length === 0) {
            this.error('No cards selected');
            return false;
        }

        // Check if cards are valid hand type
        const handType = getHandType(cards);
        if (!handType) {
            this.error('Invalid card combination');
            return false;
        }

        // Check if player has these cards
        const currentPlayer = this.context.data.players[this.context.data.currentTurn];
        const playerCardIds = new Set(currentPlayer.hand.map((c: any) => c.id));
        const allCardsInHand = cards.every(card => playerCardIds.has(card.id));

        if (!allCardsInHand) {
            this.error('Player does not have all selected cards');
            return false;
        }

        // If there's a last play, must beat it
        if (this.context.data.lastPlayedCards) {
            const canBeatLast = canBeat(
                this.context.data.lastPlayedCards.cards,
                cards
            );

            if (!canBeatLast) {
                this.error('Cards do not beat last played cards');
                return false;
            }
        }

        return true;
    }

    private validatePass(action: PassTurnAction): boolean {
        // Can only pass if there are cards on the table
        if (!this.context.data.lastPlayedCards) {
            this.error('Cannot pass on first turn');
            return false;
        }

        // Cannot pass if you played the last cards
        if (this.context.data.lastPlayedCards.playerId === action.playerId) {
            this.error('Cannot pass if you played last');
            return false;
        }

        return true;
    }

    private handlePlayCards(action: PlayCardsAction): void {
        const cards = action.payload.cards;
        const currentPlayer = this.context.data.players[this.context.data.currentTurn];

        // Remove cards from player's hand
        currentPlayer.hand = currentPlayer.hand.filter(
            (card: any) => !cards.some((c: any) => c.id === card.id)
        );

        // Set as last played
        const handType = getHandType(cards);
        this.context.data.lastPlayedCards = {
            playerId: action.playerId,
            cards: cards,
            type: handType,
        };

        this.log(`Player ${action.playerId} played ${cards.length} cards`, handType);

        // Reset pass count
        this.passCount = 0;

        // Check win condition
        if (currentPlayer.hand.length === 0) {
            this.log(`Player ${action.playerId} wins!`);
            this.context.data.winnerId = action.playerId;
            this.context.changeState(GameStateEnum.ROUND_END);
            return;
        }

        // Move to next turn
        this.advanceTurn();
    }

    private handlePass(action: PassTurnAction): void {
        this.log(`Player ${action.playerId} passed`);
        this.passCount++;

        // If 3 consecutive passes, clear the table
        if (this.passCount === 3) {
            this.log('3 passes - clearing table');
            this.context.data.lastPlayedCards = null;
            this.passCount = 0;
        }

        // Move to next turn
        this.advanceTurn();
    }

    private advanceTurn(): void {
        this.context.data.currentTurn = (this.context.data.currentTurn + 1) % 4;

        const nextPlayer = this.context.data.players[this.context.data.currentTurn];
        eventBus.emit(GameEvent.TURN_CHANGE, {
            playerId: nextPlayer.id,
        });

        this.log(`Turn advanced to ${nextPlayer.id}`);
    }

    getStateName(): string {
        return 'PlayingState';
    }
}
