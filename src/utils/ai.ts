import type { Card } from '../types';
import { getCardValue } from './rules';
import type { HandType } from './rules';

// AI Decision Reasoning
export type AIReason =
    | 'BOMB_PRESERVE'     // Avoided breaking bomb
    | 'BLOCK_LANDLORD'    // Peasant blocking landlord
    | 'HELP_TEAMMATE'     // Peasant helping teammate
    | 'ENDGAME_DUMP'      // Endgame aggressive mode
    | 'NORMAL_PLAY'       // Standard move
    | 'PASS';             // No valid move

export interface AIDecision {
    cards: Card[] | null;
    reason: AIReason;
    score?: number;
}

// Evaluate hand strength (0-100)
export const evaluateHand = (hand: Card[]): number => {
    if (hand.length === 0) return 0;

    let score = 0;
    const groups = groupCardsByValue(hand);

    // Count bombs and rockets
    const bombCount = countBombs(hand);
    score += bombCount * 25; // Bombs are very valuable

    // Count pairs and triples
    for (const [value, cards] of groups) {
        if (cards.length >= 4) {
            score += 20; // Bomb
        } else if (cards.length === 3) {
            score += 10; // Triple
        } else if (cards.length === 2) {
            score += 5; // Pair
        }

        // High value cards
        if (value >= 13) score += 3; // 2s and jokers
        else if (value >= 11) score += 2; // A, K
    }

    // Penalize having too many cards
    score -= hand.length * 0.5;

    return Math.min(100, Math.max(0, score));
};

// Check if cards form a bomb or rocket
export const isBomb = (cards: Card[]): boolean => {
    if (cards.length === 4) {
        const jokers = cards.filter(c => c.suit === 'joker');
        if (jokers.length === 4) return true; // Rocket

        const value = getCardValue(cards[0]);
        return cards.every(c => getCardValue(c) === value); // 4 of a kind
    }
    return false;
};

// Count number of bombs in hand
export const countBombs = (hand: Card[]): number => {
    const groups = groupCardsByValue(hand);
    let count = 0;

    for (const cards of groups.values()) {
        if (cards.length >= 4) {
            count++;
        }
    }

    // Check for rocket (4 jokers)
    const jokers = hand.filter(c => c.suit === 'joker');
    if (jokers.length === 4) count++;

    return count;
};

// Check if in endgame (< 5 cards)
export const isEndgame = (hand: Card[]): boolean => {
    return hand.length < 5;
};

// Helper to group cards by value
const groupCardsByValue = (hand: Card[]) => {
    const groups = new Map<number, Card[]>();
    for (const card of hand) {
        const val = getCardValue(card);
        if (!groups.has(val)) groups.set(val, []);
        groups.get(val)!.push(card);
    }
    return groups;
};

// Find all hands of a specific type and length that are greater than minVal
const findHands = (
    hand: Card[],
    type: HandType,
    minVal: number = 0
): Card[][] => {
    const groups = groupCardsByValue(hand);
    const validHands: Card[][] = [];
    const sortedValues = Array.from(groups.keys()).sort((a, b) => a - b);

    if (type === 'Single') {
        for (const val of sortedValues) {
            if (val > minVal) {
                validHands.push([groups.get(val)![0]]);
            }
        }
    } else if (type === 'Pair') {
        for (const val of sortedValues) {
            if (val > minVal && groups.get(val)!.length >= 2) {
                validHands.push(groups.get(val)!.slice(0, 2));
            }
        }
    } else if (type === 'Triple') {
        for (const val of sortedValues) {
            if (val > minVal && groups.get(val)!.length >= 3) {
                validHands.push(groups.get(val)!.slice(0, 3));
            }
        }
    } else if (type === 'Bomb') {
        for (const val of sortedValues) {
            if (val > minVal && groups.get(val)!.length >= 4) {
                validHands.push(groups.get(val)!.slice(0, 4));
            }
        }
    }

    return validHands;
};

// Find Rocket
const findRocket = (hand: Card[]): Card[] | null => {
    const jokers = hand.filter(c => c.suit === 'joker');
    if (jokers.length === 4) return jokers;
    return null;
};

export const findMoves = (
    hand: Card[],
    target: { type: HandType; value: number } | null
): Card[][] => {
    const moves: Card[][] = [];

    if (!target) {
        moves.push(...findHands(hand, 'Single', 0));
        moves.push(...findHands(hand, 'Pair', 0));
        moves.push(...findHands(hand, 'Triple', 0));
        moves.push(...findHands(hand, 'Bomb', 0));
        const rocket = findRocket(hand);
        if (rocket) moves.push(rocket);
        return moves;
    }

    if (target.type !== 'Rocket') {
        moves.push(...findHands(hand, target.type, target.value));
    }

    if (target.type !== 'Bomb' && target.type !== 'Rocket') {
        moves.push(...findHands(hand, 'Bomb', 0));
    }

    const rocket = findRocket(hand);
    if (rocket) moves.push(rocket);

    return moves;
};

export const getHint = (
    hand: Card[],
    lastPlayedCards: { type: HandType; value: number } | null
): Card[] | null => {
    // If free play, prioritize complex hands
    if (!lastPlayedCards) {
        // Try to find Straights first
        const straights = findHands(hand, 'Straight', 0);
        if (straights.length > 0) return straights[straights.length - 1]; // Longest straight? Or smallest? Let's pick longest.

        // Try Triples
        const triples = findHands(hand, 'Triple', 0);
        if (triples.length > 0) return triples[0];

        // Try Pairs
        const pairs = findHands(hand, 'Pair', 0);
        if (pairs.length > 0) return pairs[0];

        // Fallback to Singles
        const singles = findHands(hand, 'Single', 0);
        if (singles.length > 0) return singles[0];

        return null;
    }

    const moves = findMoves(hand, lastPlayedCards);
    if (moves.length === 0) return null;
    return moves[0];
};

// Enhanced AI Action with Strategy
export const aiAction = (
    hand: Card[],
    lastPlayedCards: { cards: Card[]; type: any } | null,
    playerRole?: 'landlord' | 'peasant',
    nextPlayerRole?: 'landlord' | 'peasant'
): AIDecision => {
    const target = lastPlayedCards ? lastPlayedCards.type : null;
    let possibleMoves = findMoves(hand, target);

    // No valid moves
    if (possibleMoves.length === 0) {
        return { cards: null, reason: 'PASS' };
    }

    const endgame = isEndgame(hand);
    const bombsAvailable = countBombs(hand);

    // STRATEGY 1: Bomb Preservation (unless endgame or necessary)
    if (!endgame && bombsAvailable > 0) {
        const nonBombMoves = possibleMoves.filter(cards => !isBomb(cards));

        if (nonBombMoves.length > 0) {
            possibleMoves = nonBombMoves;
            console.log('[AI Strategy] Preserving bombs for later');
        } else {
            console.log('[AI Strategy] Using bomb - no other option');
        }
    }

    // STRATEGY 2: Peasant Cooperation
    if (playerRole === 'peasant' && nextPlayerRole) {
        if (nextPlayerRole === 'landlord') {
            // Block landlord with stronger cards
            const strongMoves = possibleMoves.slice(Math.floor(possibleMoves.length / 2));
            if (strongMoves.length > 0) {
                console.log('[AI Strategy] Blocking landlord with strong cards');
                return {
                    cards: strongMoves[strongMoves.length - 1],
                    reason: 'BLOCK_LANDLORD',
                    score: evaluateHand(hand)
                };
            }
        } else {
            // Help teammate with weaker cards
            console.log('[AI Strategy] Helping teammate with weak cards');
            return {
                cards: possibleMoves[0],
                reason: 'HELP_TEAMMATE',
                score: evaluateHand(hand)
            };
        }
    }

    // STRATEGY 3: Endgame Aggression
    if (endgame) {
        console.log('[AI Strategy] Endgame mode - aggressive play');
        return {
            cards: possibleMoves[0],
            reason: 'ENDGAME_DUMP',
            score: evaluateHand(hand)
        };
    }

    // STRATEGY 4: Normal Play
    console.log('[AI Strategy] Normal play - smallest valid move');
    return {
        cards: possibleMoves[0],
        reason: 'NORMAL_PLAY',
        score: evaluateHand(hand)
    };
};
