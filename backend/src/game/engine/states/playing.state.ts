import { Injectable, Logger } from '@nestjs/common';
import { BaseState } from '../base-state';
import { GameContext } from '../game-context';
import { UserAction, ActionType } from '../../types/game.types';
import { AIService } from '../../services/ai.service';
import { RulesService } from '../../services/rules.service';
import { CardConverter } from '../../utils/card-converter';
import { GameEndState } from './game-end.state';

@Injectable()
export class PlayingState extends BaseState {
    private logger = new Logger(PlayingState.name);

    constructor(
        private aiService: AIService,
        private rulesService: RulesService,
        private gameEndState: GameEndState
    ) {
        super();
    }

    enter(context: GameContext): void {
        this.logger.log('Entering PlayingState. Game Start!');
        if (context.roomData.players.length > 0) {
            context.roomData.currentTurn = context.roomData.players[0].id;
            this.logger.log(`Current turn: ${context.roomData.currentTurn}`);
        }
        context.roomData.isAIThinking = false;
    }

    handleInput(context: GameContext, action: UserAction): void {
        if (action.playerId !== context.roomData.currentTurn) {
            this.logger.warn(`Ignored action from ${action.playerId}: Not their turn.`);
            return;
        }

        if (action.type === ActionType.PLAY) {
            // 1. Validate Move using RulesEngine
            const cards = action.payload.map(c => CardConverter.toCard(c));
            const validationResult = this.rulesService.validateMove(context, action.playerId, cards);

            if (!validationResult.isValid) {
                this.logger.warn(`Invalid move by ${action.playerId}: ${validationResult.message}`);
                return; // Reject invalid move
            }

            this.logger.log(`Player ${action.playerId} played cards: ${JSON.stringify(action.payload)}`);

            context.roomData.lastPlayedCards = {
                playerId: action.playerId,
                cards: action.payload,
            };

            // Remove played cards from hand
            const player = context.roomData.players.find(p => p.id === action.playerId);
            if (player) {
                for (const playedCard of action.payload) {
                    // Assuming payload contains exact strings from hand
                    const idx = player.hand.indexOf(playedCard);
                    if (idx !== -1) {
                        player.hand.splice(idx, 1);
                    }
                }
                player.handCount = player.hand.length;

                // Win Condition Check
                if (player.handCount === 0) {
                    this.logger.log(`Player ${player.id} has 0 cards. WINNER!`);
                    context.transitionTo(this.gameEndState);
                    return; // Stop processing, game ended
                }
            }

            this.advanceTurn(context);

        } else if (action.type === ActionType.PASS) {
            // Validate Pass (cannot pass if free turn)
            if (!context.roomData.lastPlayedCards || context.roomData.lastPlayedCards.playerId === action.playerId) {
                this.logger.warn(`Player ${action.playerId} cannot pass on free turn.`);
                return;
            }

            this.logger.log(`Player ${action.playerId} passed.`);
            this.advanceTurn(context);
        } else {
            this.logger.warn(`Invalid action type for PlayingState: ${action.type}`);
        }
    }

    update(context: GameContext, deltaTime: number): void {
        const currentPlayer = context.roomData.players.find(p => p.id === context.roomData.currentTurn);

        // AI Turn Logic
        if (currentPlayer && currentPlayer.isRobot) {
            if (!context.roomData.isAIThinking) {
                context.roomData.isAIThinking = true;
                // Schedule AI turn with delay
                this.aiService.scheduleTurn(context, currentPlayer.id);
            }
        }
    }

    exit(context: GameContext): void {
        this.logger.log('Exiting PlayingState.');
        context.roomData.isAIThinking = false;
    }

    private advanceTurn(context: GameContext) {
        const currentIndex = context.roomData.players.findIndex(p => p.id === context.roomData.currentTurn);
        if (currentIndex !== -1) {
            const nextIndex = (currentIndex + 1) % context.roomData.players.length;
            context.roomData.currentTurn = context.roomData.players[nextIndex].id;
            this.logger.log(`Turn advanced to ${context.roomData.currentTurn}`);

            // Reset AI thinking flag for new turn
            context.roomData.isAIThinking = false;
        }
    }
}
