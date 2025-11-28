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
// Analyze hand structure to identify Bombs, Triples, Pairs, Singles
const analyzeStructure = (hand: Card[]) => {
    const groups = groupCardsByValue(hand);
    const structure = {
        rockets: [] as Card[][],
        bombs: [] as Card[][],
        triples: [] as Card[][],
        pairs: [] as Card[][],
        singles: [] as Card[][],
        allGroups: groups
    };

    // Find Rocket
    const jokers = hand.filter(c => c.suit === 'joker');
    if (jokers.length === 4) {
        structure.rockets.push(jokers);
    }

    for (const [_, cards] of groups) {
        if (cards.length === 4) structure.bombs.push(cards);
        else if (cards.length === 3) structure.triples.push(cards);
        else if (cards.length === 2) structure.pairs.push(cards);
        else if (cards.length === 1) structure.singles.push(cards);
    }

    // Sort by value (ascending)
    structure.bombs.sort((a, b) => getCardValue(a[0]) - getCardValue(b[0]));
    structure.triples.sort((a, b) => getCardValue(a[0]) - getCardValue(b[0]));
    structure.pairs.sort((a, b) => getCardValue(a[0]) - getCardValue(b[0]));
    structure.singles.sort((a, b) => getCardValue(a[0]) - getCardValue(b[0]));

    return structure;
};

// Check if a move breaks a valuable structure
const doesMoveBreakStructure = (move: Card[], structure: ReturnType<typeof analyzeStructure>) => {
    const moveIds = new Set(move.map(c => c.id));

    // Check if we are breaking a bomb (and not playing it as a bomb)
    // If the move IS a bomb, it's fine.
    if (isBomb(move)) return false;

    for (const bomb of structure.bombs) {
        const intersection = bomb.filter(c => moveIds.has(c.id));
        if (intersection.length > 0 && intersection.length < 4) return true;
    }

    // Check if breaking a triple (and not playing it as a triple/airplane)
    // If move is Triple or Airplane, we might be using the triple, which is fine.
    // But if we play a Single that is part of a Triple, that's "breaking" it.
    // Simple heuristic: If move type is Single or Pair, check if it breaks Triple.
    if (move.length <= 2) {
        for (const triple of structure.triples) {
            const intersection = triple.filter(c => moveIds.has(c.id));
            if (intersection.length > 0) return true;
        }
    }

    return false;
};

// Get best move for Leading (Free Play)
const getBestLeadMove = (hand: Card[]): Card[] => {
    const structure = analyzeStructure(hand);

    // 1. Play Airplane/Straight/ConsecutivePairs if possible (Complex hands)
    // We rely on findHands to find these.
    const airplanes = findHands(hand, 'Airplane', 0);
    if (airplanes.length > 0) return airplanes[0]; // Play smallest airplane

    const straights = findHands(hand, 'Straight', 0);
    if (straights.length > 0) return straights[straights.length - 1]; // Play longest straight

    const conPairs = findHands(hand, 'ConsecutivePairs', 0);
    if (conPairs.length > 0) return conPairs[conPairs.length - 1]; // Play longest consecutive pairs

    // 2. Play Triples (with attachments if possible)
    // findMoves('TripleWithSingle') etc.
    // For simplicity, let's just play the Triple itself or rely on findMoves to generate Triple+X
    // Let's iterate types.
    const tripleMoves = [
        ...findHands(hand, 'TripleWithSingle', 0),
        ...findHands(hand, 'TripleWithPair', 0),
        ...findHands(hand, 'Triple', 0)
    ];
    if (tripleMoves.length > 0) {
        // Prefer TripleWithSingle/Pair over raw Triple if we have small cards to dump
        // But for now, just pick the first valid one (smallest value)
        return tripleMoves[0];
    }

    // 3. Play Pairs (that don't break bombs/triples)
    if (structure.pairs.length > 0) {
        return structure.pairs[0];
    }

    // 4. Play Singles (that don't break bombs/triples)
    if (structure.singles.length > 0) {
        return structure.singles[0];
    }

    // 5. If we only have broken structures left, play whatever is smallest
    // (e.g. play a single from a triple because we have no other singles)
    const allSingles = findHands(hand, 'Single', 0);
    if (allSingles.length > 0) return allSingles[0];

    // 6. Bombs/Rockets (Last resort or aggressive)
    if (structure.bombs.length > 0) return structure.bombs[0];
    if (structure.rockets.length > 0) return structure.rockets[0];

    return [hand[0]]; // Should not happen if hand not empty
};

// Get best move for Following
const getBestFollowMove = (hand: Card[], target: { type: HandType; value: number }): Card[] | null => {
    const moves = findMoves(hand, target);
    if (moves.length === 0) return null;

    const structure = analyzeStructure(hand);

    // Sort moves by quality
    // 1. Prefer moves that don't break structures
    // 2. Prefer smaller values
    moves.sort((a, b) => {
        const aBreaks = doesMoveBreakStructure(a, structure);
        const bBreaks = doesMoveBreakStructure(b, structure);

        if (aBreaks && !bBreaks) return 1;
        if (!aBreaks && bBreaks) return -1;

        // If both break or neither break, prefer smaller value (already sorted by findMoves usually, but let's ensure)
        return getCardValue(a[0]) - getCardValue(b[0]);
    });

    return moves[0];
};

// Enhanced AI Action with Strategy
export const aiAction = (
    hand: Card[],
    lastPlayedCards: { cards: Card[]; type: any } | null,
    playerRole?: 'landlord' | 'peasant',
    nextPlayerRole?: 'landlord' | 'peasant'
): AIDecision => {
    // STRATEGY: Endgame Aggression
    // If we can finish the game, do it!
    // (Simplified: if we can play all cards, do it. But findMoves returns specific types.
    // If hand forms a valid type, play it.)
    // const wholeHandType = getHandType(hand); 
    // Since we can't easily import getHandType here without circular deps or adding it to imports (it is imported as type only above)
    // Let's skip the "play whole hand" check for now or rely on findMoves finding it.

    // 1. Free Play (Leading)
    if (!lastPlayedCards) {
        const bestMove = getBestLeadMove(hand);
        console.log('[AI Strategy] Leading with:', bestMove);
        return {
            cards: bestMove,
            reason: 'NORMAL_PLAY',
            score: evaluateHand(hand)
        };
    }

    // 2. Following
    const target = lastPlayedCards.type;
    const bestMove = getBestFollowMove(hand, target);

    if (!bestMove) {
        return { cards: null, reason: 'PASS' };
    }

    // Peasant Cooperation Logic
    if (playerRole === 'peasant' && nextPlayerRole) {
        if (nextPlayerRole === 'landlord') {
            // Blocking Landlord: Try to play a bigger card if possible?
            // Current getBestFollowMove picks smallest valid.
            // If we want to block, we should pick a larger valid move.
            // Let's check if we have multiple options.
            const moves = findMoves(hand, target);
            if (moves.length > 1) {
                // Pick a move that is high enough (e.g., > 10) or just the largest available
                const largeMoves = moves.filter(m => getCardValue(m[0]) > 10);
                if (largeMoves.length > 0) {
                    return {
                        cards: largeMoves[largeMoves.length - 1], // Largest
                        reason: 'BLOCK_LANDLORD',
                        score: evaluateHand(hand)
                    };
                }
            }
        } else if (nextPlayerRole === 'peasant') {
            // Helping Teammate: If teammate played small, don't beat it unless necessary?
            // Or if teammate played big, let it pass?
            // For now, standard play is fine.
        }
    }

    // Bomb Preservation Check
    // If bestMove is a bomb, and we are not in endgame, and it's not a bomb war...
    if (isBomb(bestMove) && !isEndgame(hand) && target.type !== 'Bomb' && target.type !== 'Rocket') {
        // Don't use bomb on normal cards unless desperate?
        // Actually getBestFollowMove would only return bomb if no other move, OR if bomb is the only valid move.
        // But findMoves returns bombs for any target.
        // getBestFollowMove sorts.
        // We should check if we have a non-bomb move.
        const moves = findMoves(hand, target);
        const nonBombMoves = moves.filter(m => !isBomb(m));
        if (nonBombMoves.length > 0) {
            // We have a non-bomb move, but getBestFollowMove might have picked bomb if it was "better" (unlikely with sort).
            // But wait, findMoves includes bombs.
            // If we are beating a Single with a Bomb, that's usually bad unless endgame.
            return { cards: null, reason: 'BOMB_PRESERVE' };
        }
    }

    return {
        cards: bestMove,
        reason: 'NORMAL_PLAY',
        score: evaluateHand(hand)
    };
};
