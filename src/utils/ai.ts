import type { Card } from '../types';
import { getCardValue } from './rules';
import type { HandType } from './rules';

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
    // TODO: Add support for other types like Straight, TripleWithSingle, etc.

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

    // If Lead (target is null), return some basic moves
    if (!target) {
        // Try to find smallest Single
        moves.push(...findHands(hand, 'Single', 1));
        // Try to find smallest Pair
        moves.push(...findHands(hand, 'Pair', 2));
        // Try to find smallest Triple
        moves.push(...findHands(hand, 'Triple', 3));
        // Try to find smallest Bomb
        moves.push(...findHands(hand, 'Bomb', 4));

        // Check Rocket
        const rocket = findRocket(hand);
        if (rocket) moves.push(rocket);

        return moves;
    }

    // If Follow
    // 1. Try to beat with same type
    if (target.type !== 'Rocket') {
        moves.push(...findHands(hand, target.type, target.value));
    }

    // 2. Try to beat with Bomb (if target is not Bomb or Rocket)
    if (target.type !== 'Bomb' && target.type !== 'Rocket') {
        moves.push(...findHands(hand, 'Bomb', 0));
    }

    // 3. If target is Bomb, beat with bigger Bomb
    if (target.type === 'Bomb') {
        // Already handled by step 1 (findHands with minVal)
        // But we also need to check for longer bombs? 
        // Standard rules: Bomb length doesn't matter for rank, only value? 
        // Actually usually 4-bomb < 5-bomb etc. or just value.
        // Our rules.ts says: length > current.length OR (length == current.length AND value > current.value)

        // Find longer bombs
        // For simplicity, let's just stick to 4-card bombs for now in findHands.
        // If we want to support variable length bombs, we need more complex logic.
    }

    // 4. Beat with Rocket
    const rocket = findRocket(hand);
    if (rocket) moves.push(rocket);

    return moves;
};

export const getHint = (
    hand: Card[],
    lastPlayedCards: { type: HandType; value: number } | null
): Card[] | null => {
    const moves = findMoves(hand, lastPlayedCards);
    if (moves.length === 0) return null;

    // Simple heuristic: return the first (smallest) valid move
    // findMoves already sorts by value usually (if implemented that way), or we can sort here.
    // Our findMoves implementation returns moves in order of type, but not strictly sorted by value across types.
    // However, for a specific type, it iterates sortedValues.

    // If we want the "best" hint, usually it's the smallest valid play.
    // Since findMoves returns arrays of cards, we can sort by the value of the first card?
    // Or just return the first one found.
    return moves[0];
};

export const aiAction = (
    hand: Card[],
    lastPlayedCards: { cards: Card[]; type: any } | null
): Card[] | null => {
    const target = lastPlayedCards ? lastPlayedCards.type : null;
    const possibleMoves = findMoves(hand, target);

    if (possibleMoves.length === 0) return null;

    // Strategy:
    // If Lead: Play smallest hand (Single > Pair > Triple)
    // If Follow: Play smallest winning hand

    // Since findMoves returns sorted by value (ascending), the first one is usually the smallest.
    // But we mixed types for Lead.

    if (!target) {
        // Prefer playing Singles or Pairs to clear hand?
        // Let's just pick the very first valid move found.
        // Our findMoves pushes Singles, then Pairs, etc.
        // So it will prefer Singles.
        return possibleMoves[0];
    }

    // For Follow, findMoves returns same-type moves first, then Bombs.
    // We want the smallest same-type move.
    return possibleMoves[0];
};
