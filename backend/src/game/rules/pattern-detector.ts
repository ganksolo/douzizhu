import { Card, CardRank, PatternType, AnalysisResult } from './types';

export class PatternDetector {
    /**
     * Detects the pattern of a given set of cards.
     * @param cards Array of cards to analyze
     * @returns AnalysisResult containing the detected type and metadata
     */
    static detect(cards: Card[]): AnalysisResult {
        if (!cards || cards.length === 0) {
            return { type: PatternType.INVALID, rank: 0, length: 0 };
        }

        // Sort cards by value (descending) for easier analysis
        const sortedCards = [...cards].sort((a, b) => b.value - a.value);
        const len = sortedCards.length;

        // 1. Check for Rocket (4 Jokers)
        if (len === 4 && this.isRocket(sortedCards)) {
            return { type: PatternType.ROCKET, rank: 100, length: 4, bombCount: 4 };
        }

        // 2. Check for Bombs (4-8 cards of same rank)
        if (len >= 4 && this.isBomb(sortedCards)) {
            const bombType = this.getBombType(len);
            return {
                type: bombType,
                rank: sortedCards[0].rank,
                length: len,
                bombCount: len
            };
        }

        // 3. Check for Single
        if (len === 1) {
            return { type: PatternType.SINGLE, rank: sortedCards[0].rank, length: 1 };
        }

        // 4. Check for Pair
        if (len === 2 && this.isSameRank(sortedCards)) {
            return { type: PatternType.PAIR, rank: sortedCards[0].rank, length: 2 };
        }

        // 5. Check for Trio
        if (len === 3 && this.isSameRank(sortedCards)) {
            return { type: PatternType.TRIO, rank: sortedCards[0].rank, length: 3 };
        }

        // 6. Check for Trio with One
        if (len === 4) {
            const trioRank = this.findTrioRank(sortedCards);
            if (trioRank) {
                return { type: PatternType.TRIO_WITH_ONE, rank: trioRank, length: 4 };
            }
        }

        // 7. Check for Trio with Pair
        if (len === 5) {
            const trioRank = this.findTrioRank(sortedCards);
            if (trioRank && this.isFullHouse(sortedCards, trioRank)) {
                return { type: PatternType.TRIO_WITH_PAIR, rank: trioRank, length: 5 };
            }
        }

        // 8. Check for Sequence (Straight)
        if (len >= 5 && this.isSequence(sortedCards)) {
            return { type: PatternType.SEQUENCE, rank: sortedCards[0].rank, length: len };
        }

        // 9. Check for Sequence of Pairs (Consecutive Pairs)
        if (len >= 6 && len % 2 === 0 && this.isSequencePairs(sortedCards)) {
            return { type: PatternType.SEQUENCE_PAIR, rank: sortedCards[0].rank, length: len };
        }

        // 10. Check for Airplane (Consecutive Trios)
        // TODO: Implement Airplane logic (complex)

        return { type: PatternType.INVALID, rank: 0, length: 0 };
    }

    private static isRocket(cards: Card[]): boolean {
        // 4 Jokers: 2 Small + 2 Big
        const smallJokers = cards.filter(c => c.rank === CardRank.SMALL_JOKER).length;
        const bigJokers = cards.filter(c => c.rank === CardRank.BIG_JOKER).length;
        return smallJokers === 2 && bigJokers === 2;
    }

    private static isBomb(cards: Card[]): boolean {
        return this.isSameRank(cards);
    }

    private static getBombType(length: number): PatternType {
        switch (length) {
            case 4: return PatternType.BOMB_4;
            case 5: return PatternType.BOMB_5;
            case 6: return PatternType.BOMB_6;
            case 7: return PatternType.BOMB_7;
            case 8: return PatternType.BOMB_8;
            default: return PatternType.INVALID;
        }
    }

    private static isSameRank(cards: Card[]): boolean {
        const firstRank = cards[0].rank;
        return cards.every(c => c.rank === firstRank);
    }

    private static findTrioRank(cards: Card[]): number | null {
        // Count frequencies
        const counts = new Map<number, number>();
        for (const card of cards) {
            counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
        }

        for (const [rank, count] of counts.entries()) {
            if (count === 3) return rank;
        }
        return null;
    }

    private static isFullHouse(cards: Card[], trioRank: number): boolean {
        // 3 same + 2 same
        const pairCards = cards.filter(c => c.rank !== trioRank);
        return pairCards.length === 2 && pairCards[0].rank === pairCards[1].rank;
    }

    private static isSequence(cards: Card[]): boolean {
        // No 2 or Jokers allowed in sequence
        if (cards.some(c => c.rank >= CardRank.TWO)) return false;

        for (let i = 0; i < cards.length - 1; i++) {
            if (cards[i].rank !== cards[i + 1].rank + 1) return false;
        }
        return true;
    }

    private static isSequencePairs(cards: Card[]): boolean {
        // No 2 or Jokers allowed
        if (cards.some(c => c.rank >= CardRank.TWO)) return false;

        // Check pairs: 0=1, 2=3, 4=5...
        for (let i = 0; i < cards.length; i += 2) {
            if (cards[i].rank !== cards[i + 1].rank) return false;
        }

        // Check sequence of pairs: pair[0] == pair[1] + 1
        for (let i = 0; i < cards.length - 2; i += 2) {
            if (cards[i].rank !== cards[i + 2].rank + 1) return false;
        }
        return true;
    }
}
