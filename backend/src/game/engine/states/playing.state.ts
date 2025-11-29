import { Injectable, Logger } from '@nestjs/common';
import { BaseState } from '../base-state';
import { GameContext } from '../game-context';
import { UserAction, ActionType } from '../../types/game.types';

@Injectable()
export class PlayingState extends BaseState {
    private logger = new Logger(PlayingState.name);

    enter(context: GameContext): void {
        this.logger.log('Entering PlayingState. Game Start!');
        // In a real game, we would determine the landlord here or in a separate CallLandlordState
        // For now, let's just pick the first player as current turn
        if (context.roomData.players.length > 0) {
            context.roomData.currentTurn = context.roomData.players[0].id;
            this.logger.log(`Current turn: ${context.roomData.currentTurn}`);
        }
    }

    handleInput(context: GameContext, action: UserAction): void {
        if (action.playerId !== context.roomData.currentTurn) {
            this.logger.warn(`Ignored action from ${action.playerId}: Not their turn.`);
            return;
        }

        if (action.type === ActionType.PLAY) {
            this.logger.log(`Player ${action.playerId} played cards: ${JSON.stringify(action.payload)}`);
            // Update last played cards
            context.roomData.lastPlayedCards = {
                playerId: action.playerId,
                cards: action.payload,
            };
            // Move turn to next player (simplified)
            this.advanceTurn(context);
        } else if (action.type === ActionType.PASS) {
            this.logger.log(`Player ${action.playerId} passed.`);
            this.advanceTurn(context);
        } else {
            this.logger.warn(`Invalid action type for PlayingState: ${action.type}`);
        }
    }

    update(context: GameContext, deltaTime: number): void {
        // Check for timeouts or game end conditions
    }

    exit(context: GameContext): void {
        this.logger.log('Exiting PlayingState.');
    }

    private advanceTurn(context: GameContext) {
        const currentIndex = context.roomData.players.findIndex(p => p.id === context.roomData.currentTurn);
        if (currentIndex !== -1) {
            const nextIndex = (currentIndex + 1) % context.roomData.players.length;
            context.roomData.currentTurn = context.roomData.players[nextIndex].id;
            this.logger.log(`Turn advanced to ${context.roomData.currentTurn}`);
        }
    }
}
