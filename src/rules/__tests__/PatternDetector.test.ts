/**
 * PatternDetector Tests
 * Tests for hand pattern recognition
 */

import { describe, it, expect } from 'vitest';
import { analyze } from '../PatternDetector';
import { HandType } from '../types';
import type { Card } from '../../types';

// Helper to create cards from rank strings
function createCards(ranks: string[]): Card[] {
    return ranks.map((rank, i) => ({
        id: `card-${i}`,
        rank: rank as any,
        suit: 'spades',
        value: 0,
        isSelected: false,
    }));
}

describe('PatternDetector', () => {
    describe('Basic Patterns', () => {
        it('should detect SINGLE', () => {
            const cards = createCards(['5']);
            const result = analyze(cards);

            expect(result).not.toBeNull();
            expect(result?.type).toBe(HandType.SINGLE);
            expect(result?.value).toBe(5);
            expect(result?.length).toBe(1);
        });

        it('should detect PAIR', () => {
            const cards = createCards(['7', '7']);
            const result = analyze(cards);

            expect(result).not.toBeNull();
            expect(result?.type).toBe(HandType.PAIR);
            expect(result?.value).toBe(7);
            expect(result?.length).toBe(2);
        });

        it('should detect TRIO', () => {
            const cards = createCards(['K', 'K', 'K']);
            const result = analyze(cards);

            expect(result).not.toBeNull();
            expect(result?.type).toBe(HandType.TRIO);
            expect(result?.value).toBe(13);
            expect(result?.length).toBe(3);
        });
    });

    describe('Trio Combinations', () => {
        it('should detect TRIO_WITH_ONE: 3334 => value: 3', () => {
            const cards = createCards(['3', '3', '3', '4']);
            const result = analyze(cards);

            expect(result).not.toBeNull();
            expect(result?.type).toBe(HandType.TRIO_WITH_ONE);
            expect(result?.value).toBe(3);
            expect(result?.length).toBe(4);
            expect(result?.kickers).toEqual([4]);
        });

        it('should detect TRIO_WITH_PAIR: JJJQQ => value: J', () => {
            const cards = createCards(['J', 'J', 'J', 'Q', 'Q']);
            const result = analyze(cards);

            expect(result).not.toBeNull();
            expect(result?.type).toBe(HandType.TRIO_WITH_PAIR);
            expect(result?.value).toBe(11);
            expect(result?.length).toBe(5);
            expect(result?.kickers).toEqual([12]);
        });
    });

    describe('Chains (Straights)', () => {
        it('should detect CHAIN: 34567 => value: 3', () => {
            const cards = createCards(['3', '4', '5', '6', '7']);
            const result = analyze(cards);

            expect(result).not.toBeNull();
            expect(result?.type).toBe(HandType.CHAIN);
            expect(result?.value).toBe(3);
            expect(result?.length).toBe(5);
            expect(result?.sequenceLength).toBe(5);
        });

        it('should detect longer CHAIN: 3456789', () => {
            const cards = createCards(['3', '4', '5', '6', '7', '8', '9']);
            const result = analyze(cards);

            expect(result).not.toBeNull();
            expect(result?.type).toBe(HandType.CHAIN);
            expect(result?.value).toBe(3);
            expect(result?.sequenceLength).toBe(7);
        });

        it('should NOT detect CHAIN with 2', () => {
            const cards = createCards(['J', 'Q', 'K', 'A', '2']);
            const result = analyze(cards);

            // Should either be null or not CHAIN
            expect(result?.type).not.toBe(HandType.CHAIN);
        });

        it('should NOT detect CHAIN with less than 5 cards', () => {
            const cards = createCards(['3', '4', '5', '6']);
            const result = analyze(cards);

            expect(result?.type).not.toBe(HandType.CHAIN);
        });
    });

    describe('Chain Pairs', () => {
        it('should detect CHAIN_PAIR: 334455', () => {
            const cards = createCards(['3', '3', '4', '4', '5', '5']);
            const result = analyze(cards);

            expect(result).not.toBeNull();
            expect(result?.type).toBe(HandType.CHAIN_PAIR);
            expect(result?.value).toBe(3);
            expect(result?.sequenceLength).toBe(3);
        });

        it('should NOT detect CHAIN_PAIR with less than 3 pairs', () => {
            const cards = createCards(['3', '3', '4', '4']);
            const result = analyze(cards);

            expect(result?.type).not.toBe(HandType.CHAIN_PAIR);
        });
    });

    describe('Airplanes', () => {
        it('should detect AIRPLANE: 333444', () => {
            const cards = createCards(['3', '3', '3', '4', '4', '4']);
            const result = analyze(cards);

            expect(result).not.toBeNull();
            expect(result?.type).toBe(HandType.AIRPLANE);
            expect(result?.value).toBe(3);
            expect(result?.sequenceLength).toBe(2);
        });

        it('should detect AIRPLANE with 3 trios: 333444555', () => {
            const cards = createCards(['3', '3', '3', '4', '4', '4', '5', '5', '5']);
            const result = analyze(cards);

            expect(result).not.toBeNull();
            expect(result?.type).toBe(HandType.AIRPLANE);
            expect(result?.value).toBe(3);
            expect(result?.sequenceLength).toBe(3);
        });

        it('should detect AIRPLANE_WITH_WING (singles): 33344467', () => {
            const cards = createCards(['3', '3', '3', '4', '4', '4', '6', '7']);
            const result = analyze(cards);

            expect(result).not.toBeNull();
            expect(result?.type).toBe(HandType.AIRPLANE_WITH_WING);
            expect(result?.value).toBe(3);
            expect(result?.sequenceLength).toBe(2);
            expect(result?.kickers?.sort()).toEqual([6, 7].sort());
        });

        it('should detect AIRPLANE_WITH_WING (pairs): 3334445566', () => {
            const cards = createCards(['3', '3', '3', '4', '4', '4', '5', '5', '6', '6']);
            const result = analyze(cards);

            expect(result).not.toBeNull();
            expect(result?.type).toBe(HandType.AIRPLANE_WITH_WING);
            expect(result?.value).toBe(3);
            expect(result?.sequenceLength).toBe(2);
            expect(result?.kickers?.sort()).toEqual([5, 6].sort());
        });
    });

    describe('Bombs', () => {
        it('should detect BOMB: 5555 => value: 5', () => {
            const cards = createCards(['5', '5', '5', '5']);
            const result = analyze(cards);

            expect(result).not.toBeNull();
            expect(result?.type).toBe(HandType.BOMB);
            expect(result?.value).toBe(5);
            expect(result?.length).toBe(4);
        });

        it('should detect ROCKET: BlackJoker + RedJoker', () => {
            const cards: Card[] = [
                { id: '1', rank: 'black_joker', suit: 'joker', value: 16, isSelected: false },
                { id: '2', rank: 'red_joker', suit: 'joker', value: 17, isSelected: false },
            ];
            const result = analyze(cards);

            expect(result).not.toBeNull();
            expect(result?.type).toBe(HandType.ROCKET);
            expect(result?.value).toBe(17);
        });
    });

    describe('Invalid Hands', () => {
        it('should return null for empty array', () => {
            const result = analyze([]);
            expect(result).toBeNull();
        });

        it('should return null for invalid combination: 3345', () => {
            const cards = createCards(['3', '3', '4', '5']);
            const result = analyze(cards);
            expect(result).toBeNull();
        });

        it('should return null for non-consecutive chain: 35789', () => {
            const cards = createCards(['3', '5', '7', '8', '9']);
            const result = analyze(cards);
            expect(result).toBeNull();
        });
    });
});
