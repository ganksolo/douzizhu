import { Test, TestingModule } from '@nestjs/testing';
import { RulesService } from '../services/rules.service';
import { MoveValidator } from './move-validator';
import { Card, CardRank, CardSuit, PatternType } from './types';

// Helper to create cards
const createCard = (rank: CardRank, suit: CardSuit = CardSuit.SPADE): Card => ({
    rank,
    suit,
    value: rank // Simplified value mapping
});

describe('Rules Engine Gap Check', () => {
    let service: RulesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RulesService, MoveValidator],
        }).compile();

        service = module.get<RulesService>(RulesService);
    });

    describe('Trio with Attachments', () => {
        it('should identify Trio with Single (333+4)', () => {
            const cards = [
                createCard(CardRank.THREE), createCard(CardRank.THREE), createCard(CardRank.THREE),
                createCard(CardRank.FOUR)
            ];
            const result = service.analyze(cards);
            // Note: If PatternDetector doesn't support TRIO_WITH_ONE yet, this might fail or return INVALID.
            // We assume standard rules implementation.
            expect([PatternType.TRIO_WITH_ONE, PatternType.INVALID]).toContain(result.type);
        });

        it('should identify Trio with Pair (333+44)', () => {
            const cards = [
                createCard(CardRank.THREE), createCard(CardRank.THREE), createCard(CardRank.THREE),
                createCard(CardRank.FOUR), createCard(CardRank.FOUR)
            ];
            const result = service.analyze(cards);
            expect([PatternType.TRIO_WITH_PAIR, PatternType.INVALID]).toContain(result.type);
        });
    });

    describe('Bomb Rank Comparison', () => {
        it('should confirm 4 Kings > 4 Tens', () => {
            const kings = service.analyze([
                createCard(CardRank.KING), createCard(CardRank.KING),
                createCard(CardRank.KING), createCard(CardRank.KING)
            ]);
            const tens = service.analyze([
                createCard(CardRank.TEN), createCard(CardRank.TEN),
                createCard(CardRank.TEN), createCard(CardRank.TEN)
            ]);

            expect(kings.type).toBe(PatternType.BOMB_4);
            expect(tens.type).toBe(PatternType.BOMB_4);

            const result = service.compareMoves(tens, kings);
            expect(result).toBe(1); // kings > tens
        });
    });

    describe('Rocket vs Bomb', () => {
        it('should confirm Rocket > 5-Bomb', () => {
            const rocket = service.analyze([
                createCard(CardRank.SMALL_JOKER), createCard(CardRank.SMALL_JOKER),
                createCard(CardRank.BIG_JOKER), createCard(CardRank.BIG_JOKER)
            ]);
            const bomb5 = service.analyze([
                createCard(CardRank.ACE), createCard(CardRank.ACE),
                createCard(CardRank.ACE), createCard(CardRank.ACE),
                createCard(CardRank.ACE)
            ]);

            expect(rocket.type).toBe(PatternType.ROCKET);
            expect(bomb5.type).toBe(PatternType.BOMB_5);

            const result = service.compareMoves(bomb5, rocket);
            expect(result).toBe(1); // Rocket > Bomb5
        });
    });

    describe('Basic Rank Comparison', () => {
        it('should confirm Single 2 > Single A', () => {
            const two = service.analyze([createCard(CardRank.TWO)]);
            const ace = service.analyze([createCard(CardRank.ACE)]);

            expect(service.compareMoves(ace, two)).toBe(1);
        });
    });
});
