import { Card, CardRank, PatternType } from '../../rules/types';
import { PatternDetector } from '../../rules/pattern-detector';
import { HeuristicResult } from './types';

export class HeuristicEvaluator {
    /**
     * Evaluates the hand and returns a detailed score.
     * @param hand The player's current hand
     * @param opponentCardCounts Array of card counts of other players
     */
    static evaluate(hand: Card[], opponentCardCounts: number[]): HeuristicResult {
        const analysis = PatternDetector.detect(hand); // Basic detection (might not be enough for full hand eval, need to analyze composition)
        // Note: PatternDetector detects a *single* pattern. For a full hand, we need to decompose it.
        // For this phase, we'll use a simplified heuristic based on card ranks and potential.

        const bombScore = this.calculateBombScore(hand);
        const controlValue = this.calculateControlValue(hand);
        const straightPotential = this.calculateStraightPotential(hand);
        const riskLevel = this.calculateRiskLevel(opponentCardCounts);

        // Weighted Total
        // Risk acts as a multiplier for control value (need to control game if risk is high)
        const total = (bombScore * 1.5) + (controlValue * (1 + riskLevel)) + straightPotential;

        return {
            total,
            bombScore,
            controlValue,
            straightPotential,
            riskLevel
        };
    }

    private static calculateBombScore(hand: Card[]): number {
        let score = 0;
        const rankCounts = new Map<number, number>();
        let smallJoker = 0;
        let bigJoker = 0;

        for (const card of hand) {
            if (card.rank === CardRank.SMALL_JOKER) smallJoker++;
            else if (card.rank === CardRank.BIG_JOKER) bigJoker++;
            else rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
        }

        // Rocket
        if (smallJoker === 2 && bigJoker === 2) {
            score += 200; // Massive score for Rocket
        }

        // Bombs
        for (const count of rankCounts.values()) {
            if (count >= 4) {
                // Exponential growth: 4->10, 5->20, 6->40, 7->80, 8->160
                score += 10 * Math.pow(2, count - 4);
            }
        }

        return score;
    }

    private static calculateControlValue(hand: Card[]): number {
        let score = 0;
        for (const card of hand) {
            if (card.rank === CardRank.BIG_JOKER) score += 15;
            else if (card.rank === CardRank.SMALL_JOKER) score += 12;
            else if (card.rank === CardRank.TWO) score += 8;
            else if (card.rank === CardRank.ACE) score += 5;
            else if (card.rank === CardRank.KING) score += 2;
        }
        return score;
    }

    private static calculateStraightPotential(hand: Card[]): number {
        // Simplified: Check for contiguous ranks
        // Sort unique ranks
        const uniqueRanks = Array.from(new Set(hand.map(c => c.rank)))
            .filter(r => r < CardRank.TWO) // Exclude 2 and Jokers
            .sort((a, b) => a - b);

        let maxSeq = 0;
        let currentSeq = 1;

        for (let i = 0; i < uniqueRanks.length - 1; i++) {
            if (uniqueRanks[i + 1] === uniqueRanks[i] + 1) {
                currentSeq++;
            } else {
                maxSeq = Math.max(maxSeq, currentSeq);
                currentSeq = 1;
            }
        }
        maxSeq = Math.max(maxSeq, currentSeq);

        // Reward sequences of 5 or more
        return maxSeq >= 5 ? maxSeq * 5 : 0;
    }

    private static calculateRiskLevel(opponentCardCounts: number[]): number {
        if (!opponentCardCounts || opponentCardCounts.length === 0) return 0;

        const minCount = Math.min(...opponentCardCounts);

        if (minCount <= 2) return 1.0; // Critical
        if (minCount <= 5) return 0.8; // High
        if (minCount <= 9) return 0.5; // Medium
        return 0.1; // Low
    }
}
