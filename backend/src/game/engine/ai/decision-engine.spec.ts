import { Test, TestingModule } from '@nestjs/testing';
import { DecisionEngine } from './decision-engine';
import { RulesService } from '../../services/rules.service';
import { MoveValidator } from '../../rules/move-validator';
import { Card, CardRank, CardSuit, PatternType, AnalysisResult } from '../../rules/types';
import { GameContext } from '../../engine/game-context';

// Helper to create cards
const createCard = (rank: CardRank): Card => ({
    rank,
    suit: CardSuit.SPADE,
    value: rank
});

describe('DecisionEngine (Phase 17.2 Redo)', () => {
    let engine: DecisionEngine;
    let rulesService: RulesService;
    let mockContext: Partial<GameContext>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DecisionEngine,
                RulesService,
                MoveValidator
            ],
        }).compile();

        engine = module.get<DecisionEngine>(DecisionEngine);
        rulesService = module.get<RulesService>(RulesService);

        // Default Mock Context (Early Game)
        mockContext = {
            roomData: {
                roomId: 'test',
                players: [
                    { id: 'p1', name: 'p1', hand: Array(20).fill('X'), isReady: true }, // Self
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

    describe('Priority 1: Late Game Aggression', () => {
        it('should PLAY Bomb to win/control in Late Game', () => {
            // Hand: Bomb (4x3), Single 4
            const hand = [
                createCard(CardRank.THREE), createCard(CardRank.THREE),
                createCard(CardRank.THREE), createCard(CardRank.THREE),
                createCard(CardRank.FOUR)
            ];

            // Last Move: Pair Ace
            const lastMove: AnalysisResult = {
                type: PatternType.PAIR,
                rank: CardRank.ACE,
                length: 2,
                bombCount: 0
            };

            // Switch to Late Game (Hand < 8)
            mockContext.roomData!.players[0].hand = Array(5).fill('X');

            const result = engine.decideMove(hand, lastMove, mockContext as GameContext);

            expect(result.move).not.toBeNull();
            expect(result.move!.length).toBe(4); // Should play Bomb
            expect(result.move![0].rank).toBe(CardRank.THREE);
            expect(result.explain.reason).toContain('late');
        });
    });

    describe('Priority 2: Early Game Bomb Hoarding', () => {
        it('should PASS if only valid move is Bomb (Early Game)', () => {
            // Hand: Bomb (4x3) + 13 Singles (Total 17 cards -> Early Game)
            const hand = [
                createCard(CardRank.THREE), createCard(CardRank.THREE),
                createCard(CardRank.THREE), createCard(CardRank.THREE),
                createCard(CardRank.FOUR), createCard(CardRank.FIVE),
                createCard(CardRank.SIX), createCard(CardRank.SEVEN),
                createCard(CardRank.EIGHT), createCard(CardRank.NINE),
                createCard(CardRank.TEN), createCard(CardRank.JACK),
                createCard(CardRank.QUEEN), createCard(CardRank.KING),
                createCard(CardRank.FOUR), createCard(CardRank.FIVE),
                createCard(CardRank.SIX)
            ];

            // Last Move: Pair Ace (High Pair)
            const lastMove: AnalysisResult = {
                type: PatternType.PAIR,
                rank: CardRank.ACE,
                length: 2,
                bombCount: 0
            };

            const result = engine.decideMove(hand, lastMove, mockContext as GameContext);

            // Expect PASS because using Bomb early is penalized
            expect(result.move).toBeNull();
            // Check candidates to see Bomb was considered but scored low
            const bombCandidate = result.explain.candidates.find(c => c.type.includes('BOMB'));
            expect(bombCandidate).toBeDefined();
            // Pass score should be higher than Bomb score
            const passCandidate = result.explain.candidates.find(c => c.type === 'PASS');
            expect(passCandidate!.score).toBeGreaterThan(bombCandidate!.score);
        });
    });

    describe('Priority 3: Free Turn Structure', () => {
        it('should play smallest Single/Pair/Sequence on free turn', () => {
            // Hand: 3, 4, 5, 2
            const hand = [
                createCard(CardRank.THREE),
                createCard(CardRank.FOUR),
                createCard(CardRank.FIVE),
                createCard(CardRank.TWO)
            ];

            const result = engine.decideMove(hand, null, mockContext as GameContext);

            expect(result.move).not.toBeNull();
            expect(result.move!.length).toBe(1);
            expect(result.move![0].rank).toBe(CardRank.THREE); // Smallest single
        });
    });

    describe('Scenario: Early Game - Pair 3 vs Pair 2/Pair 5', () => {
        it('should play Pair 5 (Smallest Valid) to save Pair 2 (Control)', () => {
            // Hand: Pair 2, Pair 5
            const hand = [
                createCard(CardRank.TWO), createCard(CardRank.TWO),
                createCard(CardRank.FIVE), createCard(CardRank.FIVE)
            ];

            // Last Move: Pair 3
            const lastMove: AnalysisResult = {
                type: PatternType.PAIR,
                rank: CardRank.THREE,
                length: 2,
                bombCount: 0
            };

            const result = engine.decideMove(hand, lastMove, mockContext as GameContext);

            expect(result.move).not.toBeNull();
            expect(result.move!.length).toBe(2);
            expect(result.move![0].rank).toBe(CardRank.FIVE); // Should play Pair 5

            // Verify Pair 2 was considered but scored lower
            const pair2Candidate = result.explain.candidates.find(c => c.move[0].rank === CardRank.TWO);
            const pair5Candidate = result.explain.candidates.find(c => c.move[0].rank === CardRank.FIVE);

            expect(pair5Candidate!.score).toBeGreaterThan(pair2Candidate!.score);
        });
    });
});
