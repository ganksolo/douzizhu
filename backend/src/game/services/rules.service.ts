import { Injectable } from '@nestjs/common';
import { Card, AnalysisResult } from '../rules/types';
import { PatternDetector } from '../rules/pattern-detector';
import { MoveComparator } from '../rules/move-comparator';
import { MoveValidator, ValidationResult } from '../rules/move-validator';
import { GameContext } from '../engine/game-context';

@Injectable()
export class RulesService {
    constructor(private validator: MoveValidator) { }

    /**
     * Validates a player's move against the current game context.
     */
    validateMove(
        context: GameContext,
        playerId: string,
        inputCards: Card[]
    ): ValidationResult {
        return this.validator.validate(context, playerId, inputCards);
    }

    /**
     * Compares two moves directly.
     * @returns 1 if current > prev, -1 if current < prev, 0 if invalid
     */
    compareMoves(prev: AnalysisResult, current: AnalysisResult): number {
        return MoveComparator.compare(prev, current);
    }

    /**
     * Analyzes a set of cards to determine their pattern.
     */
    analyze(cards: Card[]): AnalysisResult {
        return PatternDetector.detect(cards);
    }

    /**
     * Helper to sort cards by value (descending)
     */
    sortCards(cards: Card[]): Card[] {
        return [...cards].sort((a, b) => b.value - a.value);
    }
}
