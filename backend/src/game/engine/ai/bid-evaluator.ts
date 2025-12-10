import { Injectable, Logger } from '@nestjs/common';
import { Player } from '../../types/game.types';

/**
 * Phase 35: BidEvaluator - AI 叫分决策评估器
 * 
 * 评估手牌强度，返回建议叫分值 (0-3)
 * 
 * 评估标准:
 * - 炸弹数量: 每个炸弹 +2 分
 * - 王数量: 大王 +2, 小王 +1
 * - 2 的数量: 每张 2 +0.5 分
 * 
 * 阈值:
 * - ≥4 分: 叫 3
 * - ≥2 分: 叫 2
 * - ≥1 分: 叫 1
 * - <1 分: 不叫 (0)
 */
@Injectable()
export class BidEvaluator {
    private readonly logger = new Logger(BidEvaluator.name);

    /**
     * 评估手牌并返回建议叫分值
     * @param hand 手牌数组 (牌面字符串如 "♠A", "RedJoker")
     * @param highestBid 当前最高叫分
     * @returns 建议叫分值 0-3
     */
    evaluate(hand: string[], highestBid: number): number {
        let score = 0;

        // 统计牌面
        const rankCounts = new Map<string, number>();
        let blackJokerCount = 0;
        let redJokerCount = 0;
        let twosCount = 0;

        for (const card of hand) {
            if (card === 'BlackJoker') {
                blackJokerCount++;
                score += 1; // 小王 +1
            } else if (card === 'RedJoker') {
                redJokerCount++;
                score += 2; // 大王 +2
            } else {
                // 解析牌面 (如 "♠A" -> "A")
                const rank = this.extractRank(card);
                rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);

                if (rank === '2') {
                    twosCount++;
                }
            }
        }

        // 2 的数量加分
        score += twosCount * 0.5;

        // 检测炸弹 (4 张或更多相同)
        let bombCount = 0;
        for (const [rank, count] of rankCounts) {
            if (count >= 4) {
                bombCount++;
            }
        }
        score += bombCount * 2;

        // 火箭 (双王)
        if (blackJokerCount >= 1 && redJokerCount >= 1) {
            score += 2; // 火箭额外加分
        }

        this.logger.debug(`BidEvaluator: score=${score}, bombs=${bombCount}, jokers=${blackJokerCount + redJokerCount}, twos=${twosCount}`);

        // 根据分数决定叫分
        let suggestedBid = 0;
        if (score >= 4) {
            suggestedBid = 3;
        } else if (score >= 2) {
            suggestedBid = 2;
        } else if (score >= 1) {
            suggestedBid = 1;
        }

        // 叫分必须大于当前最高分
        if (suggestedBid <= highestBid) {
            // 如果建议叫分不高于当前最高，考虑是否要强叫更高
            if (score >= 3 && highestBid < 3) {
                suggestedBid = highestBid + 1;
            } else {
                suggestedBid = 0; // 不叫
            }
        }

        // 确保不超过 3
        suggestedBid = Math.min(suggestedBid, 3);

        this.logger.log(`BidEvaluator: Final bid suggestion = ${suggestedBid} (score=${score.toFixed(1)}, highestBid=${highestBid})`);

        return suggestedBid;
    }

    /**
     * 从牌面字符串提取点数
     * 例如: "♠A" -> "A", "♥10" -> "10"
     */
    private extractRank(card: string): string {
        // 移除花色符号
        return card.replace(/[♠♥♣♦]/g, '');
    }
}
