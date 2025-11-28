/**
 * Core type definitions for the Pure Functional Rules Engine
 */

import type { Card } from '../types';

/**
 * All possible hand types in Dou Dizhu
 */
export const HandType = {
    SINGLE: 'SINGLE',
    PAIR: 'PAIR',
    TRIO: 'TRIO',
    TRIO_WITH_ONE: 'TRIO_WITH_ONE',
    TRIO_WITH_PAIR: 'TRIO_WITH_PAIR',
    CHAIN: 'CHAIN',
    CHAIN_PAIR: 'CHAIN_PAIR',
    AIRPLANE: 'AIRPLANE',
    AIRPLANE_WITH_WING: 'AIRPLANE_WITH_WING',
    BOMB: 'BOMB',
    ROCKET: 'ROCKET',
} as const;

export type HandType = typeof HandType[keyof typeof HandType];

/**
 * Result of analyzing a hand of cards
 */
export interface AnalysisResult {
    /** The type of hand detected */
    type: HandType;

    /** 
     * Core rank value 
     * - For TRIO_WITH_ONE: the rank of the trio
     * - For CHAIN: the rank of the lowest card
     * - For AIRPLANE: the rank of the lowest trio
     */
    value: number;

    /** Total number of cards in the hand */
    length: number;

    /** 
     * Rank values of kicker/attached cards (optional)
     * Used for TRIO_WITH_ONE, TRIO_WITH_PAIR, AIRPLANE_WITH_WING
     */
    kickers?: number[];

    /** 
     * Length of the main sequence (for chains/airplanes)
     * - CHAIN: number of consecutive cards
     * - CHAIN_PAIR: number of consecutive pairs
     * - AIRPLANE: number of consecutive trios
     */
    sequenceLength?: number;
}

/**
 * Helper type for card frequency analysis
 */
export interface CardFrequency {
    value: number;
    count: number;
}

/**
 * Utility: Get numeric value for a card's rank
 */
export function getCardValue(card: Card): number {
    const values: Record<string, number> = {
        '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
        'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
        'black_joker': 16, 'red_joker': 17,
    };
    return values[card.rank] || 0;
}

/**
 * Utility: Count card frequencies
 * Returns array sorted by value (ascending)
 */
export function countFrequencies(cards: Card[]): CardFrequency[] {
    const freqMap = new Map<number, number>();

    for (const card of cards) {
        const value = getCardValue(card);
        freqMap.set(value, (freqMap.get(value) || 0) + 1);
    }

    return Array.from(freqMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value - b.value);
}
