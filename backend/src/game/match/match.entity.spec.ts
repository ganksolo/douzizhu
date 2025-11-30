import { MatchRecord } from './match.entity';
import { PlayerSnapshot, MatchResultData } from './match.types';

describe('MatchRecord Entity (Phase 19.1 Unit Tests)', () => {
    describe('computeDuration()', () => {
        it('should compute duration in seconds correctly', () => {
            const record = new MatchRecord();
            record.startTime = new Date('2025-11-30 10:00:00');
            record.endTime = new Date('2025-11-30 10:08:00');

            record.computeDuration();

            expect(record.duration).toBe(480); // 8 minutes = 480 seconds
        });

        it('should handle longer durations', () => {
            const record = new MatchRecord();
            record.startTime = new Date('2025-11-30 10:00:00');
            record.endTime = new Date('2025-11-30 10:15:30');

            record.computeDuration();

            expect(record.duration).toBe(930); // 15 min 30 sec = 930 seconds
        });

        it('should not compute if times are missing', () => {
            const record = new MatchRecord();
            record.computeDuration();

            expect(record.duration).toBeUndefined();
        });
    });

    describe('JSON Data Types', () => {
        it('should accept valid PlayerSnapshot array', () => {
            const players: PlayerSnapshot[] = [
                {
                    userId: 'player-1',
                    username: 'Alice',
                    role: 'landlord',
                    finalHand: ['♠A', '♥K'],
                    score: 150,
                    handCount: 2
                },
                {
                    userId: 'player-2',
                    username: 'Bob',
                    role: 'peasant',
                    finalHand: [],
                    score: -50,
                    handCount: 0
                }
            ];

            const record = new MatchRecord();
            record.playersJson = players;

            expect(record.playersJson).toHaveLength(2);
            expect(record.playersJson[0].userId).toBe('player-1');
            expect(record.playersJson[1].role).toBe('peasant');
        });

        it('should accept valid MatchResultData', () => {
            const resultData: MatchResultData = {
                players: [],
                actions: [
                    { type: 'PLAY', playerId: 'p1', cards: ['♠3'], timestamp: 1000 },
                    { type: 'PASS', playerId: 'p2', cards: [], timestamp: 2000 }
                ],
                landlordPlayerId: 'p1',
                winnerPlayerId: 'p2',
                winMethod: 'normal',
                multiplier: 2,
                duration: 480
            };

            const record = new MatchRecord();
            record.resultJson = resultData;

            expect(record.resultJson.actions).toHaveLength(2);
            expect(record.resultJson.winMethod).toBe('normal');
            expect(record.resultJson.multiplier).toBe(2);
        });
    });

    describe('Schema Validation (Type Safety)', () => {
        it('should enforce required fields', () => {
            const record = new MatchRecord();

            // These should not cause TypeScript errors
            record.roomId = 'test-room';
            record.winnerPlayerId = 'winner-id';
            record.landlordPlayerId = 'landlord-id';
            record.playersJson = [];
            record.resultJson = {
                players: [],
                actions: [],
                landlordPlayerId: '',
                winnerPlayerId: '',
                winMethod: 'normal',
                multiplier: 1,
                duration: 0
            };
            record.startTime = new Date();
            record.endTime = new Date();

            expect(record.roomId).toBe('test-room');
        });

        it('should handle optional duration field', () => {
            const record = new MatchRecord();
            expect(record.duration).toBeUndefined();

            record.duration = 500;
            expect(record.duration).toBe(500);
        });
    });
});
