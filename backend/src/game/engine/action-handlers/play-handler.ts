import { Injectable, Logger } from '@nestjs/common';
import { ActionHandler } from './action-handler.interface';
import { GameContext } from '../game-context';
import { GameAction } from '../../types/game.types';
import { RulesService } from '../../services/rules.service';
import { TurnManager } from '../turn-manager';
import { CardConverter } from '../../utils/card-converter';
import { GameEndState } from '../states/game-end.state';

@Injectable()
export class PlayActionHandler implements ActionHandler {
    private logger = new Logger(PlayActionHandler.name);

    constructor(
        private rulesService: RulesService,
        private turnManager: TurnManager,
        private gameEndState: GameEndState,
    ) { }

    handle(context: GameContext, action: GameAction): void {
        const { playerId, payload } = action;

        // 1. Check Turn
        if (context.roomData.currentTurn !== playerId) {
            throw new Error(`Not your turn! Current turn: ${context.roomData.currentTurn}`);
        }

        // 2. Verify Ownership (Do I have these cards?)
        const player = context.roomData.players.find(p => p.id === playerId);
        if (!player) throw new Error('Player not found');

        const handStrings = [...player.hand]; // Clone hand
        for (const card of payload) { // payload is Card[]
            const cardStr = CardConverter.toString(card);
            const idx = handStrings.indexOf(cardStr);
            if (idx === -1) {
                throw new Error(`You do not have card ${cardStr}`);
            }
            handStrings.splice(idx, 1); // Remove to prevent double usage of same card
        }

        // 3. Validate Move (Rules)
        const cards = payload; // Assuming Card[]

        const validation = this.rulesService.validateMove(context, playerId, cards);
        if (!validation.isValid) {
            throw new Error(validation.message || validation.error || 'Invalid move');
        }

        // 4. Execute Move
        this.logger.log(`Player ${playerId} played ${cards.length} cards.`);

        // Update Last Played
        const cardStrings = cards.map(c => CardConverter.toString(c));

        context.roomData.lastPlayedCards = {
            playerId: playerId,
            cards: cardStrings
        };

        // Remove cards from hand
        // Re-fetch player to be safe (though reference should be fine)
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
            context.transitionTo(this.gameEndState);
        } else {
            // 5. Advance Turn
            this.turnManager.nextTurn(context);
        }
    }
}
