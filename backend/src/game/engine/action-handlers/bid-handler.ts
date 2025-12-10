import { Injectable, Logger } from '@nestjs/common';
import { ActionHandler } from './action-handler.interface';
import { GameContext } from '../game-context';
import { GameAction, ActionType } from '../../types/game.types';

/**
 * Phase 35: BidActionHandler - 处理叫分动作
 */
@Injectable()
export class BidActionHandler implements ActionHandler {
    private readonly logger = new Logger(BidActionHandler.name);

    handle(context: GameContext, action: GameAction): void {
        // 验证当前是否为叫分阶段
        const stateName = context.getCurrentStateName();
        if (stateName !== 'BiddingState') {
            throw new Error(`Cannot BID in state: ${stateName}. Expected BiddingState.`);
        }

        // 验证是否轮到该玩家
        if (action.playerId !== context.roomData.currentTurn) {
            throw new Error(`Not your turn. Current turn: ${context.roomData.currentTurn}`);
        }

        // 验证叫分值
        const bid = action.payload?.bid;
        if (typeof bid !== 'number' || bid < 0 || bid > 3) {
            throw new Error(`Invalid bid value: ${bid}. Must be 0-3.`);
        }

        // 验证叫分必须大于当前最高分 (除非不叫)
        const highestBid = context.roomData.highestBid || 0;
        if (bid > 0 && bid <= highestBid) {
            throw new Error(`Bid ${bid} must be higher than current highest ${highestBid}`);
        }

        this.logger.log(`BidActionHandler: Player ${action.playerId} bids ${bid}`);

        // 委托给 BiddingState 处理
        context.handleInput({
            playerId: action.playerId,
            type: ActionType.BID,
            payload: { bid }
        });
    }
}
