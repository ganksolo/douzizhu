/**
 * MoveComparator Tests
 * Tests for move comparison logic (canBeat)
 */

import { describe, it, expect } from 'vitest';
import { analyze } from '../PatternDetector';
import { canBeat } from '../MoveComparator';
import type { Card } from '../../types';

// Helper to create cards
function createCards(ranks: string[]): Card[] {
    return ranks.map((rank, i) => ({
        id: `card-${i}`,
        rank: rank as any,
        suit: 'spades',
        value: 0,
        isSelected: false,
    }));
}

describe('MoveComparator', () => {
    describe('Same Type Comparisons', () => {
        it('should compare TRIOs: KKK > JJJ', () => {
            const prev = analyze(createCards(['J', 'J', 'J']))!;
            const curr = analyze(createCards(['K', 'K', 'K']))!;

            expect(canBeat(prev, curr)).toBe(true);
        });

        it('should compare TRIOs: 999 < QQQ', () => {
            const prev = analyze(createCards(['Q', 'Q', 'Q']))!;
            const curr = analyze(createCards(['9', '9', '9']))!;

            expect(canBeat(prev, curr)).toBe(false);
        });

        it('should compare PAIRs: AA > KK', () => {
            const prev = analyze(createCards(['K', 'K']))!;
            const curr = analyze(createCards(['A', 'A']))!;

            expect(canBeat(prev, curr)).toBe(true);
        });

        it('should compare SINGLEs: 2 > A', () => {
            const prev = analyze(createCards(['A']))!;
            const curr = analyze(createCards(['2']))!;

            expect(canBeat(prev, curr)).toBe(true);
        });
    });

    describe('Chain Comparisons', () => {
        it('should compare CHAINs of same length: 45678 > 34567', () => {
            const prev = analyze(createCards(['3', '4', '5', '6', '7']))!;
            const curr = analyze(createCards(['4', '5', '6', '7', '8']))!;

            expect(canBeat(prev, curr)).toBe(true);
        });

        it('should reject CHAINs of different length', () => {
            const prev = analyze(createCards(['3', '4', '5', '6', '7']))!; // 5 cards
            const curr = analyze(createCards(['5', '6', '7', '8', '9', '10']))!; // 6 cards

            expect(canBeat(prev, curr)).toBe(false);
        });

        it('should compare CHAIN_PAIR of same length', () => {
            const prev = analyze(createCards(['3', '3', '4', '4', '5', '5']))!;
            const curr = analyze(createCards(['6', '6', '7', '7', '8', '8']))!;

            expect(canBeat(prev, curr)).toBe(true);
        });
    });

    describe('Airplane Comparisons', () => {
        it('should compare AIRPLANEs of same length', () => {
            const prev = analyze(createCards(['3', '3', '3', '4', '4', '4']))!;
            const curr = analyze(createCards(['5', '5', '5', '6', '6', '6']))!;

            expect(canBeat(prev, curr)).toBe(true);
        });

        it('should reject AIRPLANEs of different length', () => {
            const prev = analyze(createCards(['3', '3', '3', '4', '4', '4']))!; // 2 trios
            const curr = analyze(createCards(['5', '5', '5', '6', '6', '6', '7', '7', '7']))!; // 3 trios

            expect(canBeat(prev, curr)).toBe(false);
        });
    });

    describe('Bomb Logic', () => {
        it('should allow BOMB to beat PAIR: BOMB(4444) > PAIR(22)', () => {
            const prev = analyze(createCards(['2', '2']))!;
            const curr = analyze(createCards(['4', '4', '4', '4']))!;

            expect(canBeat(prev, curr)).toBe(true);
        });

        it('should allow BOMB to beat TRIO', () => {
            const prev = analyze(createCards(['A', 'A', 'A']))!;
            const curr = analyze(createCards(['3', '3', '3', '3']))!;

            expect(canBeat(prev, curr)).toBe(true);
        });

        it('should allow BOMB to beat CHAIN', () => {
            const prev = analyze(createCards(['3', '4', '5', '6', '7']))!;
            const curr = analyze(createCards(['8', '8', '8', '8']))!;

            expect(canBeat(prev, curr)).toBe(true);
        });

        it('should compare BOMBs: AAAA > 5555', () => {
            const prev = analyze(createCards(['5', '5', '5', '5']))!;
            const curr = analyze(createCards(['A', 'A', 'A', 'A']))!;

            expect(canBeat(prev, curr)).toBe(true);
        });
    });

    describe('Rocket Logic', () => {
        it('should allow ROCKET to beat BOMB', () => {
            const prev = analyze(createCards(['2', '2', '2', '2']))!;
            const curr = analyze([
                { id: '1', rank: 'black_joker', suit: 'joker', value: 16, isSelected: false },
                { id: '2', rank: 'red_joker', suit: 'joker', value: 17, isSelected: false },
            ])!;

            expect(canBeat(prev, curr)).toBe(true);
        });

        it('should allow ROCKET to beat any hand', () => {
            const prev = analyze(createCards(['A', 'A', 'A']))!;
            const curr = analyze([
                { id: '1', rank: 'black_joker', suit: 'joker', value: 16, isSelected: false },
                { id: '2', rank: 'red_joker', suit: 'joker', value: 17, isSelected: false },
            ])!;

            expect(canBeat(prev, curr)).toBe(true);
        });

        it('should NOT allow BOMB to beat ROCKET', () => {
            const prev = analyze([
                { id: '1', rank: 'black_joker', suit: 'joker', value: 16, isSelected: false },
                { id: '2', rank: 'red_joker', suit: 'joker', value: 17, isSelected: false },
            ])!;
            const curr = analyze(createCards(['2', '2', '2', '2']))!;

            expect(canBeat(prev, curr)).toBe(false);
        });
    });

    describe('Type Mismatch', () => {
        it('should reject TRIO vs PAIR', () => {
            const prev = analyze(createCards(['K', 'K']))!;
            const curr = analyze(createCards(['A', 'A', 'A']))!;

            expect(canBeat(prev, curr)).toBe(false);
        });

        it('should reject CHAIN vs CHAIN_PAIR', () => {
            const prev = analyze(createCards(['3', '3', '4', '4', '5', '5']))!; // CHAIN_PAIR
            const curr = analyze(createCards(['3', '4', '5', '6', '7']))!; // CHAIN

            expect(canBeat(prev, curr)).toBe(false);
        });

        it('should reject SINGLE vs PAIR', () => {
            const prev = analyze(createCards(['A', 'A']))!;
            const curr = analyze(createCards(['2']))!;

            expect(canBeat(prev, curr)).toBe(false);
        });
    });
});
