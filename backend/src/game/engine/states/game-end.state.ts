import { Injectable, Logger } from '@nestjs/common';
import { BaseState } from '../base-state';
import { GameContext } from '../game-context';
import { MatchService } from '../../services/match.service';
import { UserAction } from '../../types/game.types';

/**
 * Phase 19.2 + Issue #34: Game End State
 * 
 * Handles match settlement, persistence, and game_end event broadcast.
 */
@Injectable()
export class GameEndState extends BaseState {
    private logger = new Logger(GameEndState.name);

    constructor(
        private matchService: MatchService,
    ) {
        super();
    }

    async enter(context: GameContext): Promise<void> {
        this.logger.log(`Entering GameEndState for room ${context.roomData.roomId}`);

        const winnerId = this.determineWinner(context);
        if (!winnerId) {
            this.logger.error('Game ended but no winner found!');
            return;
        }

        const winner = context.roomData.players.find(p => p.id === winnerId);
        const isLandlordWin = winner?.role === 'landlord';

        // Issue #34: Set game end data in roomData for StateSerializer
        context.roomData.winnerId = winnerId;
        context.roomData.winnerSeatIndex = winner?.seatIndex ?? null;
        context.roomData.isLandlordWin = isLandlordWin;

        this.logger.log(`Game Over! Winner: ${winnerId}, isLandlordWin: ${isLandlordWin}, multiplier: ${context.roomData.multiplier}`);

        // Persist match result (Fire and forget / Async)
        this.matchService.saveMatchResult(
            context.roomData,
            winnerId,
            context.roomData.startTime || new Date()
        ).catch(err => {
            this.logger.error(`Failed to save match result in background: ${err.message}`);
        });

        // Note: game_end event is broadcast via onStateChange callback in GameContext.transitionTo()
        // StateSerializer will include winnerId, isLandlordWin, multiplier in sync_state
    }

    handleInput(context: GameContext, action: UserAction): void {
        if (action.type === 'READY') {
            // Handle player ready logic for next game
            // This would transition back to InitState/DealingState eventually
        }
    }

    update(context: GameContext, deltaTime: number): void {
        // No active updates needed in end state
    }

    exit(context: GameContext): void {
        this.logger.log('Exiting GameEndState');
        // Clear temp data
        context.roomData.actionHistory = [];
        context.roomData.lastPlayedCards = undefined;
        context.roomData.startTime = undefined;
        context.roomData.winnerId = undefined;
        context.roomData.winnerSeatIndex = undefined;
        context.roomData.isLandlordWin = undefined;
    }

    private determineWinner(context: GameContext): string | null {
        // Winner is the player with 0 cards
        const winner = context.roomData.players.find(p => p.hand && p.hand.length === 0);
        return winner ? winner.id : null;
    }
}
