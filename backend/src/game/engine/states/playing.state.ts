import { Injectable, Logger } from '@nestjs/common';
import { BaseState } from '../base-state';
import { GameContext } from '../game-context';
import { UserAction, ActionType } from '../../types/game.types';
import { AIService } from '../../services/ai.service';
import { RulesService } from '../../services/rules.service';
import { CardConverter } from '../../utils/card-converter';
import { GameEndState } from './game-end.state';

// Issue #41/#45: Turn timeout duration in milliseconds (15 seconds)
const TURN_TIMEOUT_MS = 15 * 1000;

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

        // Fix: Landlord plays first, not always players[0]
        const landlordSeat = context.roomData.landlordSeatIndex;
        if (landlordSeat !== null && landlordSeat !== undefined) {
            const landlord = context.roomData.players.find(p => p.seatIndex === landlordSeat);
            if (landlord) {
                context.roomData.currentTurn = landlord.id;
                this.logger.log(`Landlord (Seat ${landlordSeat}) plays first: ${landlord.id}`);
            } else {
                // Fallback to first player if landlord not found
                context.roomData.currentTurn = context.roomData.players[0]?.id;
                this.logger.warn(`Landlord seat ${landlordSeat} not found, falling back to players[0]`);
            }
        } else if (context.roomData.players.length > 0) {
            context.roomData.currentTurn = context.roomData.players[0].id;
            this.logger.warn(`No landlord set, defaulting to players[0]`);
        }

        context.roomData.isAIThinking = false;
        // Issue #41: Record turn start time
        context.roomData.turnStartTime = Date.now();
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
                // Issue #47 Debug: Log hand before deduction
                const handBefore = player.hand.length;

                for (const playedCard of action.payload) {
                    // Assuming payload contains exact strings from hand
                    const idx = player.hand.indexOf(playedCard);
                    if (idx !== -1) {
                        player.hand.splice(idx, 1);
                    } else {
                        // Issue #47 Debug: Card not found in hand!
                        this.logger.warn(`[Issue #47] Card "${playedCard}" not found in hand! Hand: ${JSON.stringify(player.hand.slice(0, 5))}...`);
                    }
                }
                player.handCount = player.hand.length;

                // Issue #47 Debug: Log hand after deduction
                this.logger.log(`[Issue #47 Debug] Player ${player.id} hand: ${handBefore} -> ${player.handCount} (played ${action.payload.length} cards)`);

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
            return; // AI handles its own timeout
        }

        // Issue #41: Human player turn timeout detection
        if (currentPlayer && !currentPlayer.isRobot) {
            const turnStartTime = context.roomData.turnStartTime || Date.now();
            const elapsed = Date.now() - turnStartTime;

            if (elapsed >= TURN_TIMEOUT_MS) {
                this.logger.warn(`Player ${currentPlayer.id} timed out after ${elapsed}ms. Auto-action triggered.`);
                this.handleTimeout(context, currentPlayer.id);
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
            // Issue #41: Reset turn start time for new player
            context.roomData.turnStartTime = Date.now();
        }
    }

    /**
     * Issue #41: Handle player timeout
     * - If can pass → auto Pass
     * - If free turn (must play) → auto play smallest card
     */
    private handleTimeout(context: GameContext, playerId: string): void {
        const canPass = context.roomData.lastPlayedCards &&
            context.roomData.lastPlayedCards.playerId !== playerId;

        if (canPass) {
            // Auto Pass
            this.logger.log(`Auto-PASS for player ${playerId} due to timeout.`);
            context.handleInput({ playerId, type: ActionType.PASS });
        } else {
            // Free turn: must play something → play smallest single card
            const player = context.roomData.players.find(p => p.id === playerId);
            if (player && player.hand.length > 0) {
                // Sort hand and play smallest
                const sortedHand = [...player.hand].sort((a, b) => {
                    const cardA = CardConverter.toCard(a);
                    const cardB = CardConverter.toCard(b);
                    return cardA.rank - cardB.rank;
                });
                const smallestCard = sortedHand[0];
                this.logger.log(`Auto-PLAY smallest card [${smallestCard}] for player ${playerId} due to timeout.`);
                context.handleInput({ playerId, type: ActionType.PLAY, payload: [smallestCard] });
            }
        }
    }
}
