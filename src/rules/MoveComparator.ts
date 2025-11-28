/**
 * Move Comparator - Pure functional comparison logic
 * Determines if one move beats another
 */

import { HandType, type AnalysisResult } from './types';

/**
 * Check if current move beats previous move
 * @param previous - Previous player's move
 * @param current - Current player's move
 * @returns true if current beats previous
 */
export function canBeat(previous: AnalysisResult, current: AnalysisResult): boolean {
    // ROCKET beats everything
    if (current.type === HandType.ROCKET) {
        return true;
    }

    // BOMB beats everything except ROCKET
    if (current.type === HandType.BOMB) {
        if (previous.type === HandType.ROCKET) return false;
        if (previous.type === HandType.BOMB) {
            // Bomb vs Bomb: compare values
            return current.value > previous.value;
        }
        return true; // Bomb beats all other types
    }

    // Non-bomb/rocket: must match type
    if (current.type !== previous.type) {
        return false;
    }

    // Same type: compare based on type rules
    switch (current.type) {
        case HandType.CHAIN:
        case HandType.CHAIN_PAIR:
        case HandType.AIRPLANE:
        case HandType.AIRPLANE_WITH_WING:
            // Sequences must have same length
            if (current.sequenceLength !== previous.sequenceLength) {
                return false;
            }
            return current.value > previous.value;

        default:
            // All other types: just compare value
            return current.value > previous.value;
    }
}
