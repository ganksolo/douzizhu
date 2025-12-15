import { Injectable, Logger } from '@nestjs/common';
import { GameContext } from './game-context';
import { Player } from '../types/game.types';

@Injectable()
export class TurnManager {
    private logger = new Logger(TurnManager.name);

    /**
     * Ensures currentTurn is defined. If missing, attempts to repair it.
     */
    public ensureCurrentTurn(context: GameContext): string {
        if (context.roomData.currentTurn) {
            return context.roomData.currentTurn;
        }

        this.logger.warn(`Current turn is undefined in room ${context.roomData.roomId}. Attempting to repair...`);

        // Try landlord
        if (context.roomData.landlordId) {
            context.roomData.currentTurn = context.roomData.landlordId;
        } else if (context.roomData.players.length > 0) {
            context.roomData.currentTurn = context.roomData.players[0].id;
        }

        if (context.roomData.currentTurn) {
            this.logger.log(`Repaired current turn to: ${context.roomData.currentTurn}`);
            return context.roomData.currentTurn;
        }

        throw new Error('Failed to repair current turn: No players found');
    }

    /**
     * Advances the turn to the next player.
     * @param context Game context
     * @returns The ID of the next player
     */
    public nextTurn(context: GameContext): string {
        const players = context.roomData.players;
        if (players.length === 0) return '';

        const currentIndex = players.findIndex(p => p.id === context.roomData.currentTurn);
        let nextIndex = 0;

        if (currentIndex !== -1) {
            nextIndex = (currentIndex + 1) % players.length;
        }

        const nextPlayer = players[nextIndex];
        context.roomData.currentTurn = nextPlayer.id;

        // Reset AI thinking flag
        context.roomData.isAIThinking = false;

        this.logger.log(`Turn advanced to ${nextPlayer.id} (${nextPlayer.name})`);
        return nextPlayer.id;
    }

    /**
     * Handles a PASS action.
     * Checks if everyone else passed (round over).
     * @param context Game context
     * @param playerId Player who passed
     */
    public handlePass(context: GameContext, playerId: string): void {
        // In 4-player Dou Dizhu (2 decks), usually if 3 consecutive players pass, the round ends.
        // We need to track consecutive passes.
        // Let's assume we store 'consecutivePasses' in roomData or context.
        // If not present, we need to add it to RoomData interface or manage it here.
        // For now, let's check `lastPlayedCards`.

        // Actually, a robust way is to store `lastTurnPlayerId` who played cards.
        // If the turn comes back to `lastTurnPlayerId` without anyone else playing, it's a new round.
        // But `currentTurn` moves every time.

        // Let's use `lastPlayedCards.playerId`.
        // If `currentTurn` becomes `lastPlayedCards.playerId`, it means everyone else passed.

        // But we are inside `handlePass`, so we are about to advance turn.
        // If we advance turn and the NEXT player is the one who played the last cards, then they get a free turn.

        // Let's verify the rule:
        // Player A plays.
        // Player B passes.
        // Player C passes.
        // Player D passes.
        // Turn returns to A. A gets free turn.

        // So logic:
        // 1. Advance turn.
        // 2. If new currentTurn === lastPlayedCards.playerId, then clear lastPlayedCards (Free Turn).

        this.nextTurn(context);

        if (context.roomData.lastPlayedCards &&
            context.roomData.currentTurn === context.roomData.lastPlayedCards.playerId) {

            this.logger.log(`Round finished. ${context.roomData.currentTurn} wins the round and gets free turn.`);
            context.roomData.lastPlayedCards = undefined; // Clear for free turn
        }
    }

    /**
     * Checks if the game has ended (player has 0 cards).
     * @param context Game context
     * @returns The winner player ID or null
     */
    public checkGameEnd(context: GameContext): Player | null {
        for (const player of context.roomData.players) {
            if (player.hand.length === 0) {
                return player;
            }
        }
        return null;
    }
}
