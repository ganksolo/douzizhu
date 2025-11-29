import { Injectable, Logger } from '@nestjs/common';
import { Card, CardRank, PatternType, AnalysisResult } from '../../rules/types';
import { RulesService } from '../../services/rules.service';
import { HeuristicEvaluator } from './heuristic-evaluator';
import { StrategyModel } from './strategy-model';
import { StrategyProfile } from './types';
import { GameContext } from '../../engine/game-context';

export interface AIExplain {
    chosenMove: Card[] | null;
    reason: string;
    candidates: { move: Card[], score: number, type: string }[];
}

@Injectable()
export class DecisionEngine {
    private logger = new Logger(DecisionEngine.name);

    constructor(private rulesService: RulesService) { }

    /**
     * Decides the best move for the current player.
     * @param hand The player's current hand
     * @param lastMove The last move on the table (null if free turn)
     * @param context The game context
     */
    public decideMove(hand: Card[], lastMove: AnalysisResult | null, context: GameContext): { move: Card[] | null, explain: AIExplain } {
        // 1. Determine Strategy
        const strategy = StrategyModel.determineStrategy(hand, context);

        // 2. Detection (Generate all valid moves)
        const allMoves = this.generateAllPossibleMoves(hand);

        // 3. Filter (Keep only moves that can beat lastMove)
        let validCandidates: Card[][] = [];
        if (lastMove) {
            validCandidates = allMoves.filter(move => {
                const moveAnalysis = this.rulesService.analyze(move);
                return this.rulesService.compareMoves(lastMove, moveAnalysis) > 0;
            });
        } else {
            validCandidates = allMoves;
        }

        // 4. Simulation & Rank
        const rankedCandidates: { move: Card[], score: number, type: string }[] = validCandidates.map(move => {
            const score = this.evaluateMove(hand, move, strategy, lastMove);
            const analysis = this.rulesService.analyze(move);
            return { move, score, type: analysis.type as string };
        });

        // Add Pass option if not free turn
        if (lastMove) {
            const passScore = this.evaluateMove(hand, [], strategy, lastMove);
            rankedCandidates.push({ move: [], score: passScore, type: 'PASS' });
        }

        // Sort by score descending
        // Sort by score descending, then by rank ascending (prefer smaller cards)
        rankedCandidates.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            // Tie-breaker: Prefer smaller moves
            const rankA = a.move.length > 0 ? this.rulesService.analyze(a.move).rank : 0;
            const rankB = b.move.length > 0 ? this.rulesService.analyze(b.move).rank : 0;
            return rankA - rankB;
        });

        // 5. Selection
        const bestCandidate = rankedCandidates.length > 0 ? rankedCandidates[0] : null;
        const chosenMove = bestCandidate ? bestCandidate.move : null;

        // Construct Explain Object
        const explain: AIExplain = {
            chosenMove: chosenMove && chosenMove.length > 0 ? chosenMove : null,
            reason: bestCandidate ? `Score: ${bestCandidate.score.toFixed(1)} (${strategy.mode})` : 'No valid moves',
            candidates: rankedCandidates.slice(0, 3) // Top 3
        };

        this.logger.debug(`AI Decision: ${JSON.stringify(explain.reason)}`);

        return { move: chosenMove && chosenMove.length > 0 ? chosenMove : null, explain };
    }

    private generateAllPossibleMoves(hand: Card[]): Card[][] {
        const moves: Card[][] = [];
        const sortedHand = this.rulesService.sortCards(hand);

        // Group cards by rank
        const rankMap = new Map<number, Card[]>();
        for (const card of sortedHand) {
            if (!rankMap.has(card.rank)) rankMap.set(card.rank, []);
            rankMap.get(card.rank)!.push(card);
        }

        const getCards = (rank: number, count: number): Card[] => {
            return rankMap.get(rank)?.slice(0, count) || [];
        };

        // 1. Singles
        for (const rank of rankMap.keys()) {
            moves.push(getCards(rank, 1));
        }

        // 2. Pairs
        for (const rank of rankMap.keys()) {
            const cards = getCards(rank, 2);
            if (cards.length === 2) moves.push(cards);
        }

        // 3. Trios
        for (const rank of rankMap.keys()) {
            const cards = getCards(rank, 3);
            if (cards.length === 3) moves.push(cards);
        }

        // 4. Bombs (4-8)
        for (const rank of rankMap.keys()) {
            const cards = rankMap.get(rank)!;
            if (cards.length >= 4) {
                moves.push(cards); // Full bomb
                // Ideally we should also generate sub-bombs (e.g. 5 cards can be played as 4 cards)
                // But for simplicity, we usually play max bomb power.
            }
        }

        // 5. Rocket
        const smallJokers = rankMap.get(CardRank.SMALL_JOKER) || [];
        const bigJokers = rankMap.get(CardRank.BIG_JOKER) || [];
        if (smallJokers.length === 2 && bigJokers.length === 2) {
            moves.push([...smallJokers, ...bigJokers]);
        }

        // TODO: Sequences, Trio+1, Trio+2, etc. (Complex generation omitted for brevity but structure allows adding them)

        return moves;
    }

    private evaluateMove(currentHand: Card[], move: Card[], strategy: StrategyProfile, lastMove: AnalysisResult | null): number {
        // 1. Simulate Move
        // Remove move cards from hand
        // Note: We need to be careful about object reference equality. 
        // Assuming 'move' cards are from 'currentHand' references.
        const remainingHand = currentHand.filter(c => !move.includes(c));

        // 2. Calculate Base Heuristic of Remaining Hand
        // We assume opponent counts are handled in risk level inside HeuristicEvaluator or passed in.
        // For now, passing empty opponent counts as we focus on self-hand value.
        const heuristic = HeuristicEvaluator.evaluate(remainingHand, []);
        let score = heuristic.total;

        // 3. Strategy Weighing
        const moveAnalysis = move.length > 0 ? this.rulesService.analyze(move) : null;

        // --- Bomb Logic ---
        if (moveAnalysis && this.isBomb(moveAnalysis.type)) {
            // Penalty for using bomb in Early Game unless it's a huge threat
            if (strategy.mode === 'early') {
                // If lastMove was a Rocket or huge bomb, maybe okay.
                // If lastMove was small (e.g. single 3), and we bomb it? Bad.
                // But 'validCandidates' filter ensures we only bomb if we HAVE to (to beat it) or if it's free turn.
                // If it's free turn, don't bomb early.
                if (!lastMove) {
                    score -= 100; // Don't lead with bomb in early game
                } else {
                    // We are beating something.
                    // If we are beating a normal hand with a bomb, big penalty in early game.
                    if (!this.isBomb(lastMove.type)) {
                        score -= 60; // Waste of ammo
                    }
                }
            }
        }

        // --- Early Game Logic ---
        if (strategy.mode === 'early') {
            // Penalty for breaking structure?
            // HeuristicEvaluator 'straightPotential' handles this implicitly. 
            // If we break a straight, 'straightPotential' drops, so score drops.

            // Explicit penalty for playing big cards early if not necessary?
            if (moveAnalysis && moveAnalysis.rank > CardRank.ACE) {
                // score -= 10; // Save big cards for control
            }
        }

        // --- Late Game Logic ---
        if (strategy.mode === 'late') {
            // Aggressive: Bonus for playing any valid move (reduce hand size)
            if (move.length > 0) {
                score += 20;

                // Bonus for control (only if responding to a threat)
                if (lastMove && moveAnalysis && moveAnalysis.rank > CardRank.TEN) {
                    score += 10;
                }
            } else {
                // PASS
                // Big penalty for passing in late game if we could have played
                score -= 50;
            }
        }

        return score;
    }

    private isBomb(type: PatternType): boolean {
        return (type >= PatternType.BOMB_4 && type <= PatternType.BOMB_8) || type === PatternType.ROCKET;
    }
}
