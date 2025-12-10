import { Injectable, Logger } from '@nestjs/common';
import { GameContext } from './engine/game-context';
import { ActionPipelineService } from './engine/action-pipeline/action-pipeline.service';
import { UserAction, ActionType } from './types/game.types';
import { BidEvaluator } from './engine/ai/bid-evaluator';

@Injectable()
export class BotService {
    private readonly logger = new Logger(BotService.name);

    constructor(
        private actionPipeline: ActionPipelineService,
        private bidEvaluator: BidEvaluator,
    ) { }

    /**
     * Check if current turn is a bot and handle accordingly (bid or play)
     */
    async checkAndPlay(roomId: string, context: GameContext, broadcastCallback?: () => Promise<void>) {
        const stateName = context.getCurrentStateName();

        if (stateName === 'BiddingState') {
            await this.checkAndBid(roomId, context, broadcastCallback);
        } else if (stateName === 'PlayingState') {
            // PlayingState AI is handled by AIService via game loop
            // This is kept for compatibility
        }
    }

    /**
     * Phase 35: Check if current turn is a bot and bid if needed
     */
    async checkAndBid(roomId: string, context: GameContext, broadcastCallback?: () => Promise<void>) {
        const currentPlayerId = context.roomData.currentTurn;
        if (!currentPlayerId) return;

        const currentPlayer = context.roomData.players.find(p => p.id === currentPlayerId);
        if (!currentPlayer || !currentPlayer.isRobot) return;

        // Prevent double thinking
        if (context.roomData.isAIThinking) return;
        context.roomData.isAIThinking = true;

        this.logger.log(`Bot ${currentPlayer.name} (Seat ${currentPlayer.seatIndex}) is thinking about bid...`);

        // Issue #24 Fix: Increase delay to 2-3 seconds to give frontend time to render BIDDING UI
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

        try {
            // Evaluate hand and get suggested bid
            const highestBid = context.roomData.highestBid || 0;
            const suggestedBid = this.bidEvaluator.evaluate(currentPlayer.hand, highestBid);

            this.logger.log(`Bot ${currentPlayer.name} decides to bid: ${suggestedBid}`);

            // Execute bid action
            const bidAction: UserAction = {
                type: ActionType.BID,
                playerId: currentPlayerId,
                payload: { bid: suggestedBid }
            };

            await this.actionPipeline.execute(context, bidAction, currentPlayerId, broadcastCallback);
            this.logger.log(`Bot ${currentPlayer.name} bid ${suggestedBid} successfully`);

        } catch (e) {
            this.logger.error(`Bot ${currentPlayer.name} failed to bid: ${e.message}`);
            // Fallback: pass (bid 0)
            try {
                const passAction: UserAction = {
                    type: ActionType.BID,
                    playerId: currentPlayerId,
                    payload: { bid: 0 }
                };
                await this.actionPipeline.execute(context, passAction, currentPlayerId, broadcastCallback);
            } catch (fallbackError) {
                this.logger.error(`Bot fallback bid also failed: ${fallbackError.message}`);
            }
        } finally {
            context.roomData.isAIThinking = false;
        }
    }

    /**
     * Execute bot move during PlayingState
     */
    async executeBotMove(roomId: string, context: GameContext, playerId: string) {
        this.logger.log(`Bot ${playerId} is thinking... in room ${roomId}`);

        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            // Attempt PASS
            const passAction: UserAction = {
                type: ActionType.PASS,
                playerId,
                payload: {}
            };

            await this.actionPipeline.execute(context, passAction, playerId, async () => { });
            this.logger.log(`Bot ${playerId} PASSED`);
        } catch (e) {
            this.logger.warn(`Bot ${playerId} failed to PASS: ${e.message}. Trying to play single.`);

            // Try playing first card in hand
            const player = context.roomData.players.find(p => p.id === playerId);
            if (player && player.hand.length > 0) {
                const card = player.hand[0];
                const playAction: UserAction = {
                    type: ActionType.PLAY,
                    playerId,
                    payload: { cards: [card] }
                };
                try {
                    await this.actionPipeline.execute(context, playAction, playerId, async () => { });
                    this.logger.log(`Bot ${playerId} played ${card}`);
                } catch (err) {
                    this.logger.error(`Bot ${playerId} failed to play single: ${err.message}`);
                }
            }
        }
    }
}

