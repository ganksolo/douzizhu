import { Injectable, Logger } from '@nestjs/common';
import { ActionHandler } from './action-handler.interface';
import { GameContext } from '../game-context';
import { GameAction } from '../../types/game.types';
import { RulesService } from '../../services/rules.service';
import { TurnManager } from '../turn-manager';
import { CardConverter } from '../../utils/card-converter';

@Injectable()
export class PlayActionHandler implements ActionHandler {
    private logger = new Logger(PlayActionHandler.name);

    constructor(
        private rulesService: RulesService,
        private turnManager: TurnManager
    ) { }

    handle(context: GameContext, action: GameAction): void {
        const { playerId, payload } = action;

        // 1. Check Turn
        if (context.roomData.currentTurn !== playerId) {
            throw new Error(`Not your turn! Current turn: ${context.roomData.currentTurn}`);
        }

        // 2. Validate Move
        // Payload is expected to be Card[] (from InputNormalizer)
        // But RulesService.validateMove expects Card[]
        // Let's verify payload type. InputNormalizer converts to Card[].
        // So we can cast payload to Card[].

        // Wait, validateMove signature: validateMove(context, playerId, cards: Card[])
        const cards = payload; // Assuming Card[]

        const validation = this.rulesService.validateMove(context, playerId, cards);
        if (!validation.isValid) {
            throw new Error(validation.message || validation.error || 'Invalid move');
        }

        // 3. Execute Move
        this.logger.log(`Player ${playerId} played ${cards.length} cards.`);

        // Update Last Played
        // Note: We need to convert Card[] back to string[] for RoomData storage if RoomData uses string[]
        // RoomData.lastPlayedCards.cards is string[]
        const cardStrings = cards.map(c => CardConverter.toString(c));

        context.roomData.lastPlayedCards = {
            playerId: playerId,
            cards: cardStrings
        };

        // Remove cards from hand
        const player = context.roomData.players.find(p => p.id === playerId);
        if (player) {
            // Remove by matching rank/suit
            for (const card of cards) {
                const idx = player.hand.findIndex(c => {
                    const playerCard = CardConverter.toCard(c);
                    return playerCard.rank === card.rank && playerCard.suit === card.suit;
                });
                if (idx !== -1) {
                    player.hand.splice(idx, 1);
                }
            }
            player.handCount = player.hand.length;
        }

        // 4. Check Game End
        const winner = this.turnManager.checkGameEnd(context);
        if (winner) {
            this.logger.log(`Game Over! Winner: ${winner.name}`);
            // TODO: Transition to GameEndState
            // For now, just log it. The State Machine should handle transition.
            // Maybe we emit an event or set a flag in context?
            // context.roomData.winner = winner.id;
        } else {
            // 5. Advance Turn
            this.turnManager.nextTurn(context);
        }
    }
}
