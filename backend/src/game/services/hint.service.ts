import { Injectable, Logger } from '@nestjs/common';
import { DecisionEngine } from '../engine/ai/decision-engine';
import { RulesService } from './rules.service';
import { GameContext } from '../engine/game-context';
import { Card, CardRank, CardSuit, AnalysisResult } from '../rules/types';

/**
 * Issue #32: HintService - 提供 Hint 提示功能
 * 
 * 复用 DecisionEngine 为人类玩家提供出牌建议
 */
@Injectable()
export class HintService {
    private readonly logger = new Logger(HintService.name);

    constructor(
        private decisionEngine: DecisionEngine,
        private rulesService: RulesService,
    ) { }

    /**
     * 获取出牌建议
     * @param context 游戏上下文
     * @param playerId 请求玩家的 ID
     * @returns 推荐的牌（字符串数组）
     */
    getHint(context: GameContext, playerId: string): { suggestedCards: string[] } {
        const player = context.roomData.players.find(p => p.id === playerId);
        if (!player) {
            this.logger.warn(`Player ${playerId} not found in room`);
            return { suggestedCards: [] };
        }

        // 验证是否轮到该玩家
        if (context.roomData.currentTurn !== playerId) {
            this.logger.warn(`Not player ${playerId}'s turn`);
            return { suggestedCards: [] };
        }

        // 验证是否在 PlayingState
        const stateName = context.getCurrentStateName();
        if (stateName !== 'PlayingState') {
            this.logger.warn(`Cannot hint in state: ${stateName}`);
            return { suggestedCards: [] };
        }

        // 解析玩家手牌为 Card 对象
        const hand: Card[] = player.hand.map(c => this.parseCard(c));

        // 获取上一手牌
        let lastMove: AnalysisResult | null = null;
        if (context.roomData.lastPlayedCards && context.roomData.lastPlayedCards.cards.length > 0) {
            // Issue #33 Fix: cards 可能是 Card 对象或字符串，需要兼容处理
            const lastCards = context.roomData.lastPlayedCards.cards.map((c: any) => {
                if (typeof c === 'object' && c.rank !== undefined) {
                    return c; // 已经是 Card 对象
                }
                return this.parseCard(c); // 字符串转 Card 对象
            });
            lastMove = this.rulesService.analyze(lastCards);
        }

        // 调用 DecisionEngine 获取建议
        const decision = this.decisionEngine.decideMove(hand, lastMove, context);

        if (decision.move && decision.move.length > 0) {
            // 将 Card 对象转换回字符串
            const suggestedCards = decision.move.map(c => this.cardToString(c));
            this.logger.log(`Hint for player ${playerId}: ${suggestedCards.join(', ')}`);
            return { suggestedCards };
        }

        // 建议 PASS
        this.logger.log(`Hint for player ${playerId}: PASS`);
        return { suggestedCards: [] };
    }

    /**
     * 解析牌面字符串为 Card 对象
     * 例如: "♠A" -> { rank: CardRank.ACE, suit: CardSuit.SPADE, value: 14 }
     */
    private parseCard(cardStr: string): Card {
        if (cardStr === 'RedJoker') {
            return { rank: CardRank.BIG_JOKER, suit: CardSuit.NONE, value: 17 };
        }
        if (cardStr === 'BlackJoker') {
            return { rank: CardRank.SMALL_JOKER, suit: CardSuit.NONE, value: 16 };
        }

        const suitMap: { [key: string]: CardSuit } = {
            '♠': CardSuit.SPADE,
            '♥': CardSuit.HEART,
            '♣': CardSuit.CLUB,
            '♦': CardSuit.DIAMOND
        };

        const rankMap: { [key: string]: CardRank } = {
            '3': CardRank.THREE, '4': CardRank.FOUR, '5': CardRank.FIVE,
            '6': CardRank.SIX, '7': CardRank.SEVEN, '8': CardRank.EIGHT,
            '9': CardRank.NINE, '10': CardRank.TEN, 'J': CardRank.JACK,
            'Q': CardRank.QUEEN, 'K': CardRank.KING, 'A': CardRank.ACE, '2': CardRank.TWO
        };

        const suit = suitMap[cardStr[0]] ?? CardSuit.SPADE;
        const rankStr = cardStr.slice(1);
        const rank = rankMap[rankStr] ?? CardRank.THREE;

        return { rank, suit, value: rank };
    }

    /**
     * 将 Card 对象转换为字符串
     */
    private cardToString(card: Card): string {
        if (card.rank === CardRank.BIG_JOKER) return 'RedJoker';
        if (card.rank === CardRank.SMALL_JOKER) return 'BlackJoker';

        const ranks: { [key: number]: string } = {
            [CardRank.THREE]: '3', [CardRank.FOUR]: '4', [CardRank.FIVE]: '5',
            [CardRank.SIX]: '6', [CardRank.SEVEN]: '7', [CardRank.EIGHT]: '8',
            [CardRank.NINE]: '9', [CardRank.TEN]: '10', [CardRank.JACK]: 'J',
            [CardRank.QUEEN]: 'Q', [CardRank.KING]: 'K', [CardRank.ACE]: 'A', [CardRank.TWO]: '2'
        };

        return `${card.suit}${ranks[card.rank]}`;
    }
}

