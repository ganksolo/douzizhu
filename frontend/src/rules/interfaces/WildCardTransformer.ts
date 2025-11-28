/**
 * Wild Card Transformer Interface (Future Extension)
 * This is a stub interface for future wild card support
 */

import type { Card } from '../../types';

/**
 * Interface for transforming cards with wild card support
 * To be implemented when wild card functionality is added
 */
export interface WildCardTransformer {
    /**
     * Transform a hand of cards by substituting wild cards
     * @param cards - Original cards
     * @param wildCard - The card designated as wild
     * @returns Transformed cards with wild cards substituted
     */
    transform(cards: Card[], wildCard: Card): Card[];
}
