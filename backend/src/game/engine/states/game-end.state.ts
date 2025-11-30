import { Injectable, Logger } from '@nestjs/common';
import { BaseState } from '../base-state';
import { GameContext } from '../game-context';
import { MatchService } from '../../services/match.service';
import { UserAction } from '../../types/game.types';

/**
 * Phase 19.2: Game End State
 * 
 * Handles match settlement, persistence, and transition back to lobby/init.
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

        this.logger.log(`Game Over! Winner: ${winnerId}`);

        // Persist match result (Fire and forget / Async)
        // We don't await this to avoid blocking the game loop or broadcast
        this.matchService.saveMatchResult(
            context.roomData,
            winnerId,
            context.roomData.startTime || new Date() // Fallback if startTime missing
        ).catch(err => {
            this.logger.error(`Failed to save match result in background: ${err.message}`);
        });

        // TODO: Transition back to InitState or wait for players to get ready again
        // For now, we can reset the game after a delay
        // setTimeout(() => {
        //     this.resetGame(context);
        // }, 10000);
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
    }

    private determineWinner(context: GameContext): string | null {
        // Winner is the player with 0 cards
        const winner = context.roomData.players.find(p => p.hand && p.hand.length === 0);
        return winner ? winner.id : null;
    }
}
