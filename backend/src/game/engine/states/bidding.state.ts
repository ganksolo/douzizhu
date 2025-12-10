import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { BaseState } from '../base-state';
import { GameContext } from '../game-context';
import { PlayingState } from './playing.state';
import { DealingState } from './dealing.state';
import { UserAction, ActionType, Player } from '../../types/game.types';

/**
 * Phase 35: BiddingState - 叫分阶段状态机
 * 
 * 流程:
 * 1. enter(): 随机选择首叫玩家，初始化叫分状态
 * 2. handleInput(): 处理 BID 动作 (bid: 0-3)
 * 3. 叫分结束条件:
 *    - 有人叫 3 分 → 该玩家成为地主
 *    - 所有 4 人叫完一轮 → 最高分者成为地主
 *    - 所有人都不叫 → 重新发牌
 * 4. exit(): 将底牌 8 张加入地主手牌
 */
@Injectable()
export class BiddingState extends BaseState {
    private logger = new Logger(BiddingState.name);

    constructor(
        @Inject(forwardRef(() => PlayingState))
        private playingState: PlayingState,
        @Inject(forwardRef(() => DealingState))
        private dealingState: DealingState,
    ) {
        super();
    }

    enter(context: GameContext): void {
        this.logger.log('Entering BiddingState. Starting bid phase...');

        // Issue #23 Fix: 首叫优先人类玩家
        // 在 PVE 模式下，让人类玩家先叫分以改善 UX
        const humanPlayer = context.roomData.players.find(p => !p.isRobot);
        const firstBidder = humanPlayer?.seatIndex ?? Math.floor(Math.random() * 4);
        context.roomData.firstBidder = firstBidder;

        // 设置 currentTurn 为首叫玩家的 playerId
        const firstPlayer = context.roomData.players.find(p => p.seatIndex === firstBidder);
        if (firstPlayer) {
            context.roomData.currentTurn = firstPlayer.id;
        }

        // 初始化叫分状态
        context.roomData.bidHistory = [];
        context.roomData.highestBid = 0;
        context.roomData.landlordSeatIndex = null;
        context.roomData.isAIThinking = false;

        this.logger.log(`First bidder is Seat ${firstBidder} (${firstPlayer?.name || 'unknown'}, isHuman: ${!firstPlayer?.isRobot})`);
    }

    handleInput(context: GameContext, action: UserAction): void {
        if (action.type !== ActionType.BID) {
            this.logger.warn(`Invalid action type for BiddingState: ${action.type}`);
            return;
        }

        // 验证是否轮到该玩家
        if (action.playerId !== context.roomData.currentTurn) {
            this.logger.warn(`Ignored BID from ${action.playerId}: Not their turn (current: ${context.roomData.currentTurn})`);
            return;
        }

        const bid = action.payload?.bid ?? 0;
        const player = context.roomData.players.find(p => p.id === action.playerId);

        if (!player) {
            this.logger.error(`Player ${action.playerId} not found`);
            return;
        }

        const seatIndex = player.seatIndex;

        // 验证叫分值 (0 = 不叫, 1-3 = 叫分)
        if (bid < 0 || bid > 3) {
            this.logger.warn(`Invalid bid value: ${bid}, must be 0-3`);
            return;
        }

        // 叫分必须大于当前最高分 (除非不叫)
        if (bid > 0 && bid <= (context.roomData.highestBid || 0)) {
            this.logger.warn(`Bid ${bid} must be higher than current highest ${context.roomData.highestBid}`);
            return;
        }

        // 记录叫分
        context.roomData.bidHistory!.push({ seatIndex, bid });
        this.logger.log(`Player ${player.name} (Seat ${seatIndex}) bid: ${bid}`);

        // 更新最高分
        if (bid > (context.roomData.highestBid || 0)) {
            context.roomData.highestBid = bid;
        }

        // 检查叫分结束条件
        if (bid === 3) {
            // 叫 3 分立即成为地主
            this.setLandlord(context, seatIndex);
            return;
        }

        // 检查是否所有人都叫过
        if (context.roomData.bidHistory!.length >= 4) {
            // 所有人都叫完一轮
            if (context.roomData.highestBid === 0) {
                // 所有人都不叫 → 重新发牌
                this.logger.log('All players passed. Restarting dealing...');
                context.transitionTo(this.dealingState);
                return;
            } else {
                // 最高分者成为地主
                const highestBidEntry = context.roomData.bidHistory!
                    .filter(b => b.bid === context.roomData.highestBid)
                    .pop();
                if (highestBidEntry) {
                    this.setLandlord(context, highestBidEntry.seatIndex);
                    return;
                }
            }
        }

        // 转到下一个玩家
        this.advanceTurn(context);
    }

    update(context: GameContext, deltaTime: number): void {
        // AI 叫分由 BotService 处理
        // 这里不需要特殊处理，只需确保轮转正常
    }

    exit(context: GameContext): void {
        this.logger.log('Exiting BiddingState.');
        context.roomData.isAIThinking = false;
    }

    /**
     * 设置地主并分配底牌
     */
    private setLandlord(context: GameContext, landlordSeatIndex: number): void {
        context.roomData.landlordSeatIndex = landlordSeatIndex;

        const landlord = context.roomData.players.find(p => p.seatIndex === landlordSeatIndex);
        if (!landlord) {
            this.logger.error(`Landlord with seatIndex ${landlordSeatIndex} not found`);
            return;
        }

        context.roomData.landlordId = landlord.id;
        landlord.role = 'landlord';

        // 其他玩家设为农民
        context.roomData.players.forEach(p => {
            if (p.seatIndex !== landlordSeatIndex) {
                p.role = 'peasant';
            }
        });

        // 将 8 张底牌加入地主手牌
        const bottomCards = context.roomData.bottomCards || [];
        landlord.hand = [...landlord.hand, ...bottomCards];
        landlord.handCount = landlord.hand.length;

        this.logger.log(`Landlord is ${landlord.name} (Seat ${landlordSeatIndex}), now has ${landlord.handCount} cards`);

        // 设置地主的 currentTurn 开始出牌
        context.roomData.currentTurn = landlord.id;

        // 设置基础倍数
        context.roomData.multiplier = context.roomData.highestBid || 1;

        // 转换到出牌阶段
        context.transitionTo(this.playingState);
    }

    /**
     * 转到下一个玩家
     */
    private advanceTurn(context: GameContext): void {
        const currentPlayer = context.roomData.players.find(p => p.id === context.roomData.currentTurn);
        if (!currentPlayer) return;

        const currentSeatIndex = currentPlayer.seatIndex;
        const nextSeatIndex = (currentSeatIndex + 1) % 4;
        const nextPlayer = context.roomData.players.find(p => p.seatIndex === nextSeatIndex);

        if (nextPlayer) {
            context.roomData.currentTurn = nextPlayer.id;
            context.roomData.isAIThinking = false;
            this.logger.log(`Turn advanced to ${nextPlayer.name} (Seat ${nextSeatIndex})`);
        }
    }
}
