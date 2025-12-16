import { Injectable, Logger } from '@nestjs/common';
import { GameContext } from '../engine/game-context';
import { DecisionEngine } from '../engine/ai/decision-engine';
import { UserAction, ActionType } from '../types/game.types';
import { RulesService } from './rules.service';
import { AnalysisResult } from '../rules/types';
import { CardConverter } from '../utils/card-converter';

@Injectable()
export class AIService {
    private logger = new Logger(AIService.name);

    constructor(
        private decisionEngine: DecisionEngine,
        private rulesService: RulesService
    ) { }

    /**
     * Schedules the AI's turn with a random delay.
     * @param context Current game context
     * @param playerId ID of the AI player
     */
    public scheduleTurn(context: GameContext, playerId: string): void {
        // Random delay between 1000ms and 2500ms
        const delay = Math.floor(Math.random() * 1500) + 1000;

        this.logger.log(`AI ${playerId} is thinking... (Delay: ${delay}ms)`);

        setTimeout(async () => {
            // Issue #PVE-Cleanup: Skip AI action if no human players are online
            const hasOnlineHumans = context.roomData.players.some(p => !p.isRobot && p.online);
            if (!hasOnlineHumans && context.roomData.players.length > 0) {
                this.logger.debug(`AI ${playerId}: Skipping action (no online humans)`);
                context.roomData.isAIThinking = false;
                return;
            }

            // Check if context is still valid and it's still this player's turn
            if (context.roomData.currentTurn !== playerId) {
                this.logger.warn(`AI ${playerId} finished thinking but it's no longer their turn.`);
                return;
            }

            try {
                const action = this.executeTurnLogic(context, playerId);
                context.handleInput(action);

                // Issue #42 Debug: Log lastPlayedCards after AI action
                this.logger.log(`[Issue #42 Debug] AI ${playerId} action completed. lastPlayedCards: ${JSON.stringify(context.roomData.lastPlayedCards)}`);
            } catch (error) {
                this.logger.error(`Error during AI execution: ${error.message}`);
                // Fallback: Pass
                context.handleInput({ playerId, type: ActionType.PASS });
            } finally {
                // Issue #33 Fix: AI 执行完后必须广播状态，否则 FE 不知道 AI 已行动
                if (context.onStateChange && context.roomData.roomId) {
                    try {
                        this.logger.log(`[Issue #42 Debug] Broadcasting state for room ${context.roomData.roomId} after AI action`);
                        await context.onStateChange(context.roomData.roomId);
                    } catch (e) {
                        this.logger.error(`Failed to broadcast state after AI action: ${e.message}`);
                    }
                } else {
                    // Issue #42: If onStateChange is not set, log a warning
                    this.logger.warn(`[Issue #42] onStateChange is not set for room ${context.roomData.roomId}! AI action won't be broadcast.`);
                }
            }
        }, delay);
    }

    /**
     * Internal logic to decide the move.
     */
    private executeTurnLogic(context: GameContext, playerId: string): UserAction {
        const player = context.roomData.players.find(p => p.id === playerId);
        if (!player) {
            throw new Error(`AI player ${playerId} not found in room.`);
        }

        // Convert hand strings to Card objects
        const handCards = player.hand.map(c => CardConverter.toCard(c));

        // 1. Analyze Last Move
        let lastMoveAnalysis: AnalysisResult | null = null;
        if (context.roomData.lastPlayedCards && context.roomData.lastPlayedCards.playerId !== playerId) {
            // Only consider last move if it wasn't made by us (i.e., we are not leading a new round after everyone passed)
            // Wait, if everyone passed, lastPlayedCards might still be there but we need to check if we are the leader.
            // In Dou Dizhu, if everyone passes, the leader starts a new round.
            // The GameContext logic usually clears lastPlayedCards or sets a flag when a new round starts.
            // However, typically `currentTurn` is set to the winner of the last round.
            // If `lastPlayedCards.playerId === playerId`, it means we played last and everyone else passed.
            // So it's a free turn.

            if (context.roomData.lastPlayedCards.playerId !== playerId) {
                const lastPlayedCards = context.roomData.lastPlayedCards.cards.map(c => CardConverter.toCard(c));
                lastMoveAnalysis = this.rulesService.analyze(lastPlayedCards);
            }
        }

        // 2. Decide Move
        const decision = this.decisionEngine.decideMove(handCards, lastMoveAnalysis, context);
        const cardsToPlay = decision.move;

        if (decision.explain) {
            this.logger.debug(`AI Decision Explain: ${JSON.stringify(decision.explain)}`);
        }

        // 3. Construct Action
        if (cardsToPlay && cardsToPlay.length > 0) {
            // Convert Card objects back to strings
            const payload = cardsToPlay.map(c => CardConverter.toString(c));
            return {
                playerId,
                type: ActionType.PLAY,
                payload: payload
            };
        } else {
            return {
                playerId,
                type: ActionType.PASS
            };
        }
    }
}
