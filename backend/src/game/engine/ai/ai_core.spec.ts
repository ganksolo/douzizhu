import { Test, TestingModule } from '@nestjs/testing';
import { HeuristicEvaluator } from './heuristic-evaluator';
import { StrategyModel } from './strategy-model';
import { Card, CardRank, CardSuit } from '../../rules/types';
import { GameContext } from '../../engine/game-context';

// Helper to create cards
const createCard = (rank: CardRank): Card => ({
    rank,
    suit: CardSuit.SPADE,
    value: rank
});

describe('AI Core (Phase 17.1)', () => {

    describe('HeuristicEvaluator', () => {
        it('AI-EVAL-001: High Potential (Straight)', () => {
            // Hand: 3,3,3, 4, 5, 6, 7, 8
            const hand = [
                createCard(CardRank.THREE), createCard(CardRank.THREE), createCard(CardRank.THREE),
                createCard(CardRank.FOUR),
                createCard(CardRank.FIVE),
                createCard(CardRank.SIX),
                createCard(CardRank.SEVEN),
                createCard(CardRank.EIGHT)
            ];

            // Assume low risk
            const result = HeuristicEvaluator.evaluate(hand, [10, 10, 10]);

            // Sequence 3,4,5,6,7,8 (Length 6) -> 6 * 5 = 30 points
            expect(result.straightPotential).toBeGreaterThan(20);
            expect(result.straightPotential).toBe(30);
            expect(result.total).toBeGreaterThanOrEqual(30);
        });

        it('AI-EVAL-002: Max Control', () => {
            // Hand: BigJoker, BigJoker, 2, 2
            // Note: In real game, only 1 Big Joker exists per deck, but we test logic here.
            // Wait, 4-player has 2 decks, so 2 Big Jokers is possible!
            const hand = [
                createCard(CardRank.BIG_JOKER),
                createCard(CardRank.BIG_JOKER),
                createCard(CardRank.TWO),
                createCard(CardRank.TWO)
            ];

            const result = HeuristicEvaluator.evaluate(hand, [10, 10, 10]);

            // Control: 15 + 15 + 8 + 8 = 46
            expect(result.controlValue).toBeGreaterThan(40);
            expect(result.controlValue).toBe(46);
            expect(result.total).toBeGreaterThan(50);
        });
    });

    describe('StrategyModel', () => {
        let mockContext: Partial<GameContext>;

        beforeEach(() => {
            mockContext = {
                roomData: {
                    roomId: 'test',
                    players: [
                        { id: 'p1', name: 'p1', hand: Array(20).fill('X'), isReady: true }, // Current Turn Player (Self)
                        { id: 'p2', name: 'p2', hand: Array(17).fill('X'), isReady: true },
                        { id: 'p3', name: 'p3', hand: Array(17).fill('X'), isReady: true },
                        { id: 'p4', name: 'p4', hand: Array(17).fill('X'), isReady: true }
                    ],
                    currentTurn: 'p1',
                    deck: [],
                    multiplier: 1,
                    currentState: 'PlayingState'
                } as any
            };
        });

        it('AI-STRAT-001: Early Game', () => {
            // Hand Count 20
            const hand = Array(20).fill(createCard(CardRank.THREE));

            const strategy = StrategyModel.determineStrategy(hand, mockContext as GameContext);

            expect(strategy.mode).toBe('early');
            expect(strategy.shouldHoardBombs).toBe(true);
        });

        it('AI-STRAT-002: Emergency (Late Game Override)', () => {
            // Self has 10 cards (Mid game normally)
            const hand = Array(10).fill(createCard(CardRank.THREE));

            // Opponent p2 has 3 cards (Emergency!)
            mockContext.roomData!.players[1].hand = Array(3).fill('X');

            const strategy = StrategyModel.determineStrategy(hand, mockContext as GameContext);

            expect(strategy.mode).toBe('late');
            expect(strategy.aggressiveLevel).toBe(1.0);
        });
    });
});
