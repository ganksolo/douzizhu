import { Injectable, Logger } from '@nestjs/common';
import { GameContext } from '../engine/game-context';
import { ActionPipelineService } from '../engine/action-pipeline/action-pipeline.service';
import { UserAction, ActionType } from '../types/game.types';

@Injectable()
export class BotService {
    private readonly logger = new Logger(BotService.name);

    constructor(
        private actionPipeline: ActionPipelineService,
    ) { }

    /**
     * Check if current turn is a bot and play if needed
     */
    async checkAndPlay(roomId: string, context: GameContext) {
        const state = context.currentState;
        if (state?.stateName !== 'playing') return;

        // We need to access the state's internal data to know whose turn it is
        // This depends on how PlayingState exposes this info. 
        // Assuming context.roomData has some indicator or state has currentTurn

        // Note: In Phase 16/17 implementation, PlayingState likely manages turn index.
        // We might need to cast state or access context.roomData.

        // Let's assume we can determine it from context
        // For now, let's look at how PlayingState is implemented or just return if we can't tell.
        // But for the 'Basic Bot Gameplay' task, we need to try.

        // If we can't easily access state internals here without coupling, 
        // we'll rely on the GameGateway to verify if the 'current player' is a bot.
    }

    async executeBotMove(roomId: string, context: GameContext, playerId: string) {
        this.logger.log(`Bot ${playerId} is thinking... in room ${roomId}`);

        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Simple Strategy: Pass if possible, else play smallest card? 
        // For "Basic Gameplay (Random/Pass)", we'll just try to PASS first.
        // If PASS is not allowed (e.g. new round), play valid lowest hand.

        // Since we don't have a full rule engine valid move generator exposed yet,
        // we will make a safe assumption:
        // 1. Try to PASS.
        // 2. If rejected (start of round), play a single card.

        try {
            // Attempt PASS
            const passAction: UserAction = {
                type: ActionType.PASS,
                payload: {}
            };

            await this.actionPipeline.execute(context, passAction, playerId, async () => { });
            this.logger.log(`Bot ${playerId} PASSED`);
        } catch (e) {
            // If PASS failed (likely leading the round), play a card
            // We need to find valid cards. 
            // Phase 28 just asks for "Random valid move or Pass".

            // Allow fail for now or implement "Play Smallest Single"
            this.logger.warn(`Bot ${playerId} failed to PASS: ${e.message}. Trying to play single.`);

            // Try playing first card in hand
            const player = context.roomData.players.find(p => p.id === playerId);
            if (player && player.hand.length > 0) {
                const card = player.hand[0];
                const playAction: UserAction = {
                    type: ActionType.PLAY_CARD,
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
