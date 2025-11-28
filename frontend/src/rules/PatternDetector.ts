/**
 * Pattern Detector - Pure functional hand type recognition
 * Core algorithm for detecting what type of hand a set of cards forms
 */

import type { Card } from '../types';
import {
    HandType,
    type AnalysisResult,
    type CardFrequency,
    countFrequencies
} from './types';

/**
 * Analyze a hand of cards and determine its type
 * @param cards - Array of cards to analyze
 * @returns AnalysisResult if valid hand, null if invalid
 */
export function analyze(cards: Card[]): AnalysisResult | null {
    if (!cards || cards.length === 0) return null;

    const frequencies = countFrequencies(cards);

    // Try detection in priority order
    // ROCKET (highest priority)
    const rocket = detectRocket(frequencies);
    if (rocket) return rocket;

    // BOMB
    const bomb = detectBomb(frequencies);
    if (bomb) return bomb;

    // AIRPLANE_WITH_WING
    const airplaneWithWing = detectAirplaneWithWing(frequencies, cards.length);
    if (airplaneWithWing) return airplaneWithWing;

    // AIRPLANE
    const airplane = detectAirplane(frequencies);
    if (airplane) return airplane;

    // TRIO_WITH_PAIR
    const trioWithPair = detectTrioWithPair(frequencies);
    if (trioWithPair) return trioWithPair;

    // TRIO_WITH_ONE
    const trioWithOne = detectTrioWithOne(frequencies);
    if (trioWithOne) return trioWithOne;

    // CHAIN_PAIR
    const chainPair = detectChainPair(frequencies);
    if (chainPair) return chainPair;

    // CHAIN
    const chain = detectChain(frequencies);
    if (chain) return chain;

    // TRIO
    const trio = detectTrio(frequencies);
    if (trio) return trio;

    // PAIR
    const pair = detectPair(frequencies);
    if (pair) return pair;

    // SINGLE
    const single = detectSingle(frequencies);
    if (single) return single;

    return null;
}

// ============================================
// Detection Functions (Pure)
// ============================================

function detectRocket(freqs: CardFrequency[]): AnalysisResult | null {
    if (freqs.length !== 2) return null;

    const values = freqs.map(f => f.value).sort((a, b) => a - b);
    if (values[0] === 16 && values[1] === 17) {
        return {
            type: HandType.ROCKET,
            value: 17, // Red joker is highest
            length: 2,
        };
    }
    return null;
}

function detectBomb(freqs: CardFrequency[]): AnalysisResult | null {
    if (freqs.length !== 1) return null;
    if (freqs[0].count === 4) {
        return {
            type: HandType.BOMB,
            value: freqs[0].value,
            length: 4,
        };
    }
    return null;
}

function detectSingle(freqs: CardFrequency[]): AnalysisResult | null {
    if (freqs.length === 1 && freqs[0].count === 1) {
        return {
            type: HandType.SINGLE,
            value: freqs[0].value,
            length: 1,
        };
    }
    return null;
}

function detectPair(freqs: CardFrequency[]): AnalysisResult | null {
    if (freqs.length === 1 && freqs[0].count === 2) {
        return {
            type: HandType.PAIR,
            value: freqs[0].value,
            length: 2,
        };
    }
    return null;
}

function detectTrio(freqs: CardFrequency[]): AnalysisResult | null {
    if (freqs.length === 1 && freqs[0].count === 3) {
        return {
            type: HandType.TRIO,
            value: freqs[0].value,
            length: 3,
        };
    }
    return null;
}

function detectTrioWithOne(freqs: CardFrequency[]): AnalysisResult | null {
    if (freqs.length !== 2) return null;

    const trio = freqs.find(f => f.count === 3);
    const single = freqs.find(f => f.count === 1);

    if (trio && single) {
        return {
            type: HandType.TRIO_WITH_ONE,
            value: trio.value,
            length: 4,
            kickers: [single.value],
        };
    }
    return null;
}

function detectTrioWithPair(freqs: CardFrequency[]): AnalysisResult | null {
    if (freqs.length !== 2) return null;

    const trio = freqs.find(f => f.count === 3);
    const pair = freqs.find(f => f.count === 2);

    if (trio && pair) {
        return {
            type: HandType.TRIO_WITH_PAIR,
            value: trio.value,
            length: 5,
            kickers: [pair.value],
        };
    }
    return null;
}

function detectChain(freqs: CardFrequency[]): AnalysisResult | null {
    // Must be at least 5 cards
    if (freqs.length < 5) return null;

    // All must be singles
    if (!freqs.every(f => f.count === 1)) return null;

    // Must be consecutive
    if (!isConsecutive(freqs.map(f => f.value))) return null;

    // Cannot include 2 or jokers
    if (freqs.some(f => f.value >= 15)) return null;

    return {
        type: HandType.CHAIN,
        value: freqs[0].value, // Lowest card
        length: freqs.length,
        sequenceLength: freqs.length,
    };
}

function detectChainPair(freqs: CardFrequency[]): AnalysisResult | null {
    // Must be at least 3 pairs (6 cards)
    if (freqs.length < 3) return null;

    // All must be pairs
    if (!freqs.every(f => f.count === 2)) return null;

    // Must be consecutive
    if (!isConsecutive(freqs.map(f => f.value))) return null;

    // Cannot include 2 or jokers
    if (freqs.some(f => f.value >= 15)) return null;

    return {
        type: HandType.CHAIN_PAIR,
        value: freqs[0].value,
        length: freqs.length * 2,
        sequenceLength: freqs.length,
    };
}

function detectAirplane(freqs: CardFrequency[]): AnalysisResult | null {
    // Must be at least 2 trios
    const trios = freqs.filter(f => f.count === 3);
    if (trios.length < 2) return null;

    // Must be only trios (no kickers)
    if (trios.length !== freqs.length) return null;

    // Must be consecutive
    if (!isConsecutive(trios.map(f => f.value))) return null;

    // Cannot include 2 or jokers
    if (trios.some(f => f.value >= 15)) return null;

    return {
        type: HandType.AIRPLANE,
        value: trios[0].value,
        length: trios.length * 3,
        sequenceLength: trios.length,
    };
}

function detectAirplaneWithWing(freqs: CardFrequency[], totalCards: number): AnalysisResult | null {
    const trios = freqs.filter(f => f.count === 3);

    // Must have at least 2 consecutive trios
    if (trios.length < 2) return null;
    if (!isConsecutive(trios.map(f => f.value))) return null;
    if (trios.some(f => f.value >= 15)) return null;

    const trioCount = trios.length;
    const kickers = freqs.filter(f => f.count !== 3);

    // Check if wings match (either all singles or all pairs)
    const expectedWingCards = trioCount; // Number of wing cards/pairs needed

    // Wings as singles
    if (kickers.length === expectedWingCards && kickers.every(f => f.count === 1)) {
        return {
            type: HandType.AIRPLANE_WITH_WING,
            value: trios[0].value,
            length: totalCards,
            sequenceLength: trioCount,
            kickers: kickers.map(k => k.value),
        };
    }

    // Wings as pairs
    if (kickers.length === expectedWingCards && kickers.every(f => f.count === 2)) {
        return {
            type: HandType.AIRPLANE_WITH_WING,
            value: trios[0].value,
            length: totalCards,
            sequenceLength: trioCount,
            kickers: kickers.map(k => k.value),
        };
    }

    return null;
}

// ============================================
// Helper Functions
// ============================================

function isConsecutive(values: number[]): boolean {
    if (values.length < 2) return false;

    for (let i = 0; i < values.length - 1; i++) {
        if (values[i + 1] !== values[i] + 1) return false;
    }
    return true;
}
