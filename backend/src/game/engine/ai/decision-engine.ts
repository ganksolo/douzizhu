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

        // Issue #48 Debug: Log move generation results
        this.logger.log(`[AI] Generated ${allMoves.length} possible moves from ${hand.length} cards`);

        // 3. Filter (Keep only moves that can beat lastMove)
        let validCandidates: Card[][] = [];
        if (lastMove) {
            this.logger.log(`[AI] Filtering moves against lastMove: type=${lastMove.type}, rank=${lastMove.rank}, length=${lastMove.length}`);
            validCandidates = allMoves.filter(move => {
                const moveAnalysis = this.rulesService.analyze(move);
                const compResult = this.rulesService.compareMoves(lastMove, moveAnalysis);
                // Log first few comparisons for debugging
                if (allMoves.indexOf(move) < 5) {
                    this.logger.debug(`[AI] Compare: move type=${moveAnalysis.type}, rank=${moveAnalysis.rank} vs lastMove rank=${lastMove.rank} => ${compResult}`);
                }
                return compResult > 0;
            });
            this.logger.log(`[AI] After filtering against lastMove (${lastMove.type}), ${validCandidates.length} valid candidates`);
        } else {
            // Free turn: all moves are valid
            validCandidates = allMoves;
            this.logger.log(`[AI] Free turn, all ${validCandidates.length} moves are valid`);
        }

        // 4. Simulation & Rank
        const rankedCandidates: { move: Card[], score: number, type: string }[] = validCandidates.map(move => {
            const score = this.evaluateMove(hand, move, strategy, lastMove);
            const analysis = this.rulesService.analyze(move);
            return { move, score, type: analysis.type as string };
        });

        // Add Pass option if not free turn (lastMove exists)
        if (lastMove) {
            const passScore = this.evaluateMove(hand, [], strategy, lastMove);
            rankedCandidates.push({ move: [], score: passScore, type: 'PASS' });
        }

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
        let bestCandidate = rankedCandidates.length > 0 ? rankedCandidates[0] : null;

        // Issue #48 Fix: On free turn, AI MUST play something (not pass)
        // If bestCandidate is a pass on free turn, pick the first non-pass move
        if (!lastMove && bestCandidate && bestCandidate.move.length === 0) {
            const nonPassMoves = rankedCandidates.filter(c => c.move.length > 0);
            if (nonPassMoves.length > 0) {
                bestCandidate = nonPassMoves[0];
                this.logger.log(`[AI] Free turn: forced to pick a move instead of pass`);
            }
        }

        const chosenMove = bestCandidate ? bestCandidate.move : null;

        // Construct Explain Object
        const explain: AIExplain = {
            chosenMove: chosenMove && chosenMove.length > 0 ? chosenMove : null,
            reason: bestCandidate ? `Score: ${bestCandidate.score.toFixed(1)} (${strategy.mode})` : 'No valid moves',
            candidates: rankedCandidates.slice(0, 3) // Top 3
        };

        this.logger.log(`[AI] Decision: ${chosenMove && chosenMove.length > 0 ? `Play ${chosenMove.length} cards (${bestCandidate?.type})` : 'PASS'}`);

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
            }
        }

        // 5. Rocket (4 jokers)
        const smallJokers = rankMap.get(CardRank.SMALL_JOKER) || [];
        const bigJokers = rankMap.get(CardRank.BIG_JOKER) || [];
        if (smallJokers.length === 2 && bigJokers.length === 2) {
            moves.push([...smallJokers, ...bigJokers]);
        }

        // 6. Sequences (顺子: 5+ consecutive singles, 3-A no 2)
        const validRanks = Array.from(rankMap.keys())
            .filter(r => r >= CardRank.THREE && r <= CardRank.ACE)
            .sort((a, b) => a - b);

        for (let len = 5; len <= 12; len++) {
            for (let i = 0; i <= validRanks.length - len; i++) {
                const sequence: Card[] = [];
                let isConsecutive = true;
                for (let j = 0; j < len; j++) {
                    if (j > 0 && validRanks[i + j] !== validRanks[i + j - 1] + 1) {
                        isConsecutive = false;
                        break;
                    }
                    const card = getCards(validRanks[i + j], 1)[0];
                    if (card) sequence.push(card);
                }
                if (isConsecutive && sequence.length === len) {
                    moves.push(sequence);
                }
            }
        }

        // 7. Pair Sequences (连对: 3+ consecutive pairs)
        for (let len = 3; len <= 10; len++) {
            for (let i = 0; i <= validRanks.length - len; i++) {
                const pairSeq: Card[] = [];
                let isValid = true;
                for (let j = 0; j < len; j++) {
                    if (j > 0 && validRanks[i + j] !== validRanks[i + j - 1] + 1) {
                        isValid = false;
                        break;
                    }
                    const cards = getCards(validRanks[i + j], 2);
                    if (cards.length === 2) {
                        pairSeq.push(...cards);
                    } else {
                        isValid = false;
                        break;
                    }
                }
                if (isValid && pairSeq.length === len * 2) {
                    moves.push(pairSeq);
                }
            }
        }

        // 8. Trio + 1 (三带一)
        for (const rank of rankMap.keys()) {
            const trio = getCards(rank, 3);
            if (trio.length === 3) {
                // Find a kicker (single card of different rank)
                for (const kickerRank of rankMap.keys()) {
                    if (kickerRank !== rank) {
                        const kicker = getCards(kickerRank, 1);
                        if (kicker.length >= 1) {
                            moves.push([...trio, kicker[0]]);
                            break; // Only add one trio+1 per trio
                        }
                    }
                }
            }
        }

        // 9. Trio + 2 (三带二)
        for (const rank of rankMap.keys()) {
            const trio = getCards(rank, 3);
            if (trio.length === 3) {
                // Find a pair kicker (different rank)
                for (const kickerRank of rankMap.keys()) {
                    if (kickerRank !== rank) {
                        const kicker = getCards(kickerRank, 2);
                        if (kicker.length === 2) {
                            moves.push([...trio, ...kicker]);
                            break; // Only add one trio+2 per trio
                        }
                    }
                }
            }
        }

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

        // --- Free Turn Bonus: Prefer playing more cards at once ---
        if (!lastMove && move.length > 0) {
            // Bonus for playing multiple cards (to reduce hand faster)
            const multiCardBonus = move.length * 5; // 5 points per card
            score += multiCardBonus;

            // Extra bonus for sequences and pair sequences (good structural plays)
            if (moveAnalysis) {
                const type = moveAnalysis.type;
                // Sequences and pair sequences get extra bonus
                if (type === PatternType.SEQUENCE || type === PatternType.SEQUENCE_PAIR) {
                    score += 15;
                }
                // Trio combinations also good
                if (type === PatternType.TRIO_WITH_ONE || type === PatternType.TRIO_WITH_PAIR) {
                    score += 10;
                }
            }
        }

        // --- Responding to Opponent's Move: Reward playing, penalize pass ---
        if (lastMove && move.length > 0) {
            // Base reward for beating opponent's move
            score += 30;

            // Additional reward for playing small cards to beat (save big cards)
            if (moveAnalysis && moveAnalysis.rank <= CardRank.TEN) {
                score += 10; // Use small cards when possible
            }
        } else if (lastMove && move.length === 0) {
            // Pass penalty when we could have played
            // HeuristicEvaluator gives high score for keeping cards, but we need to reduce hand
            score -= 15;
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
