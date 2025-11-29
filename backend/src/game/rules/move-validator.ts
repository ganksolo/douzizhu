import { Injectable, Logger } from '@nestjs/common';
import { Card, AnalysisResult, PatternType } from './types';
import { PatternDetector } from './pattern-detector';
import { MoveComparator } from './move-comparator';
import { GameContext } from '../engine/game-context';
import { CardConverter } from '../utils/card-converter';

export interface ValidationResult {
    isValid: boolean;
    error?: string;
    message?: string; // For success messages or additional info
    analysis?: AnalysisResult;
}

@Injectable()
export class MoveValidator {
    private logger = new Logger(MoveValidator.name);

    validate(
        context: GameContext,
        playerId: string,
        inputCards: Card[]
    ): ValidationResult {
        // 1. Ownership Check (Anti-cheat)
        const player = context.roomData.players.find(p => p.id === playerId);
        if (!player) {
            return { isValid: false, error: 'Player not found', message: 'Player not found' };
        }

        // Fix type mismatch: player.hand is string[], inputCards is Card[]
        // We need to convert player.hand to Card[] before checking
        const handCards = player.hand.map(c => CardConverter.toCard(c));
        if (!this.hasCards(handCards, inputCards)) {
            return { isValid: false, error: 'You do not own these cards', message: 'You do not own these cards' };
        }

        // 2. Pattern Detection
        const analysis = PatternDetector.detect(inputCards);
        if (analysis.type === PatternType.INVALID) {
            return { isValid: false, error: 'Invalid card pattern', message: 'Invalid card pattern' };
        }

        // 3. Contextual Validation
        const lastMove = context.roomData.lastPlayedCards;
        const isFreeTurn = !lastMove || lastMove.playerId === playerId;

        if (isFreeTurn) {
            // Free turn: Any valid pattern is allowed
            return { isValid: true, analysis };
        } else {
            // Follow turn: Must beat the last move
            // We need to re-analyze last move to get its metadata (or store it in context)
            // Assuming context stores AnalysisResult would be better, but for now re-detect
            // TODO: Optimize by storing AnalysisResult in roomData
            // Convert strings to Cards if necessary. lastMove.cards is string[]?
            // Actually AnalysisResult.cards is Card[]?
            // Let's check types.ts.
            // If lastMove is AnalysisResult, then cards is Card[].
            // If lastMove is { playerId: string, cards: string[] } (from GameContext), then it is string[].
            // In GameContext, lastPlayedCards is { playerId: string, cards: string[] }.
            // So we need to convert.
            // We need CardConverter here.
            // But MoveValidator doesn't import CardConverter.
            // Let's import it or assume input is Card[]?
            // The method signature says inputCards: Card[].
            // But lastMove.cards is from context.

            // Let's import CardConverter.
            // Wait, I can't easily add import with replace_file_content if I don't see the top.
            // I'll use a helper or just cast if I'm lazy, but better to do it right.
            // I'll assume CardConverter is needed.
            // Actually, I can just map it if I know the structure, but CardConverter is safer.
            // Let's check if I can add import.
            // I'll read the file top first to be sure.
            // Actually I saw the file content in Step 579.
            // It imports: Card, AnalysisResult, PatternType, PatternDetector, MoveComparator, GameContext.
            // No CardConverter.

            // I will add the import and fix the line.
            // Since I can't do multiple disjoint edits with replace_file_content, I'll use multi_replace_file_content.

            // Wait, I'll just use multi_replace_file_content to add import and fix line.
            const lastPlayedCards = lastMove.cards.map(c => CardConverter.toCard(c));
            const lastAnalysis = PatternDetector.detect(lastPlayedCards);

            const comparison = MoveComparator.compare(lastAnalysis, analysis);
            if (comparison === 1) {
                return { isValid: true, analysis };
            } else {
                return { isValid: false, error: 'Your cards must be larger than the previous play', message: 'Your cards must be larger than the previous play' };
            }
        }
    }

    private hasCards(hand: Card[], input: Card[]): boolean {
        // Create frequency map of hand
        const handCounts = new Map<string, number>();
        // Note: hand is Card[], but we need to match input cards which are also Card[]
        // The input cards might come from payload which are strings, but here they are Card objects.
        // Assuming Card objects have suit/rank.
        // Wait, the input to validate is Card[].
        // But the player.hand in context is string[] usually?
        // Let's check context.roomData.players[].hand type.
        // In types.ts, Player.hand is string[].
        // But here hasCards takes hand: Card[].
        // The caller (PlayingState) converts player.hand to Card[]?
        // No, PlayingState calls validateMove(context, playerId, cards).
        // RulesService.validateMove calls MoveValidator.validate.
        // MoveValidator.validate gets player from context.
        // player.hand is string[].
        // But hasCards expects Card[].
        // There is a type mismatch here too!

        // Let's look at line 29: if (!this.hasCards(player.hand, inputCards))
        // player.hand is string[] (from GameContext interface usually).
        // inputCards is Card[].

        // I should fix the syntax first. The type error might show up next.
        // But wait, if I just fix syntax, I might hit type error.
        // Let's assume for now I just fix syntax.

        for (const card of hand) {
            const key = `${card.suit}-${card.rank}`;
            handCounts.set(key, (handCounts.get(key) || 0) + 1);
        }

        // Check if input cards exist in hand
        for (const card of input) {
            const key = `${card.suit}-${card.rank}`;
            const count = handCounts.get(key);
            if (!count || count === 0) return false;
            handCounts.set(key, count - 1);
        }
        return true;
    }
}
