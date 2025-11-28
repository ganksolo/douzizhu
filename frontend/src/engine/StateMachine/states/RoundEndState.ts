/**
 * RoundEndState - Round completion and scoring
 * Calculates scores and handles restart
 */

import { BaseState } from '../BaseState';
import { GameStateEnum } from '../../GameStateEnum';
import type { AnyGameAction } from '../../GameAction';
import { GameActionType } from '../../GameAction';
import { eventBus, GameEvent } from '../../EventBus';
import { ScoreManager } from '../../../utils/score';

export class RoundEndState extends BaseState {
    enter(_data?: any): void {
        this.log('Entering ROUND_END state');

        if (!this.context.data.winnerId || !this.context.data.landlordId) {
            this.error('Missing winner or landlord ID');
            return;
        }

        // Calculate and save scores
        const landlordId = this.context.data.landlordId;
        const baseScore = this.context.data.bids[landlordId] || 1;

        // TODO: Track bomb count and spring detection
        const bombCount = 0;
        const isSpring = false;
        const isAntiSpring = false;

        const result = ScoreManager.calculateScore(
            this.context.data.winnerId,
            landlordId,
            baseScore,
            bombCount,
            isSpring,
            isAntiSpring,
            this.context.data.players
        );

        ScoreManager.saveResult(result);

        // Emit score update
        eventBus.emit(GameEvent.SCORE_UPDATE, {
            scores: result.scores,
        });

        this.log('Round complete, winner:', this.context.data.winnerId);
    }

    update(_deltaTime: number): void {
        // No auto-transition, wait for user to restart
    }

    exit(): void {
        this.log('Exiting ROUND_END state');
    }

    validate(action: AnyGameAction): boolean {
        // Only allow restart action (we'll use START_GAME for restart)
        return action.type === GameActionType.START_GAME;
    }

    handleAction(action: AnyGameAction): void {
        if (action.type === GameActionType.START_GAME) {
            this.log('Restarting game');
            this.context.changeState(GameStateEnum.INIT);
        }
    }

    getStateName(): string {
        return 'RoundEndState';
    }
}
