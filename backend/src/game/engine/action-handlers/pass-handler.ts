import { Injectable, Logger } from '@nestjs/common';
import { ActionHandler } from './action-handler.interface';
import { GameContext } from '../game-context';
import { GameAction } from '../../types/game.types';
import { TurnManager } from '../turn-manager';

@Injectable()
export class PassActionHandler implements ActionHandler {
    private logger = new Logger(PassActionHandler.name);

    constructor(
        private turnManager: TurnManager
    ) { }

    handle(context: GameContext, action: GameAction): void {
        const { playerId } = action;

        // 1. Check Turn
        // Issue #58: Ensure currentTurn is defined (repair if needed)
        const currentTurn = this.turnManager.ensureCurrentTurn(context);

        if (currentTurn !== playerId) {
            throw new Error(`Not your turn! Current turn: ${currentTurn}`);
        }

        // 2. Check Rule (Cannot pass on free turn)
        if (!context.roomData.lastPlayedCards || context.roomData.lastPlayedCards.playerId === playerId) {
            throw new Error('Cannot pass on a free turn. You must play cards.');
        }

        // 3. Execute Pass
        this.logger.log(`Player ${playerId} passed.`);
        this.turnManager.handlePass(context, playerId);
    }
}
