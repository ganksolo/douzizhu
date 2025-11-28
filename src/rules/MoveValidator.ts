/**
 * Move Validator - Pure functional validation logic
 */

import type { Card } from '../types';
import { analyze } from './PatternDetector';

/**
 * Check if a set of cards forms a valid hand
 * @param cards - Cards to validate
 * @returns true if valid, false otherwise
 */
export function isValidMove(cards: Card[]): boolean {
    return analyze(cards) !== null;
}

/**
 * Check if cards can be played as first move
 * @param cards - Cards to play
 * @returns true if valid first move
 */
export function canPlayFirst(cards: Card[]): boolean {
    // Any valid hand type can be played first
    return isValidMove(cards);
}
