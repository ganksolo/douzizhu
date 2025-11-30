import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchRepository } from './match.repository';
import { MatchRecord } from './match.entity';
import { PlayerSnapshot, MatchResultData } from './match.types';

/**
 * Phase 19.1: Match Repository Integration Tests
 * 
 * These tests verify database operations including:
 * - JSON column storage/retrieval
 * - JSON_SEARCH queries for player participation
 * - Indexed queries for performance
 * - Date range filtering
 * 
 * Requirements: MySQL database running with test database configured
 */
describe('MatchRepository (Phase 19.1 Integration Tests)', () => {
    let repository: MatchRepository;
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'mysql',
                    host: process.env.DB_HOST || 'localhost',
                    port: parseInt(process.env.DB_PORT || '3306'),
                    username: process.env.DB_USERNAME || 'root',
                    password: process.env.DB_PASSWORD || '',
                    database: process.env.DB_DATABASE || 'doudizhu_test',
                    entities: [MatchRecord],
                    synchronize: true, // Auto-create tables for testing
                }),
                TypeOrmModule.forFeature([MatchRecord]),
            ],
            providers: [MatchRepository],
        }).compile();

        repository = module.get<MatchRepository>(MatchRepository);
    });

    afterAll(async () => {
        await module.close();
    });

    describe('DB-002: Insert Match Record with JSON Data', () => {
        it('should insert match record and auto-compute duration', async () => {
            const playersJson: PlayerSnapshot[] = [
                {
                    userId: 'player-A',
                    username: 'Alice',
                    role: 'landlord',
                    finalHand: ['♠A', '♥A'],
                    score: 120,
                    handCount: 2
                },
                {
                    userId: 'player-B',
                    username: 'Bob',
                    role: 'peasant',
                    finalHand: [],
                    score: -40,
                    handCount: 0
                }
            ];

            const resultJson: MatchResultData = {
                players: playersJson,
                actions: [
                    { type: 'PLAY', playerId: 'player-A', cards: ['♠3'], timestamp: 1000 },
                    { type: 'PASS', playerId: 'player-B', cards: [], timestamp: 2000 }
                ],
                landlordPlayerId: 'player-A',
                winnerPlayerId: 'player-B',
                winMethod: 'normal',
                multiplier: 2,
                duration: 480
            };

            const startTime = new Date('2025-11-30 09:00:00');
            const endTime = new Date('2025-11-30 09:08:00');

            const record = await repository.createAndSave({
                roomId: 'test-room-123',
                winnerPlayerId: 'player-B',
                landlordPlayerId: 'player-A',
                playersJson,
                resultJson,
                startTime,
                endTime
            });

            expect(record.id).toBeDefined();
            expect(record.duration).toBe(480); // 8 minutes = 480 seconds
            expect(record.roomId).toBe('test-room-123');
        });
    });

    describe('DB-003: JSON_SEARCH Query for Player Participation', () => {
        beforeEach(async () => {
            // Insert test data
            const playersJsonA: PlayerSnapshot[] = [
                { userId: 'player-A', username: 'Alice', role: 'landlord', finalHand: [], score: 100, handCount: 0 },
                { userId: 'player-B', username: 'Bob', role: 'peasant', finalHand: [], score: -50, handCount: 0 }
            ];

            const playersJsonC: PlayerSnapshot[] = [
                { userId: 'player-C', username: 'Charlie', role: 'landlord', finalHand: [], score: 80, handCount: 0 },
                { userId: 'player-D', username: 'Diana', role: 'peasant', finalHand: [], score: -40, handCount: 0 }
            ];

            await repository.createAndSave({
                roomId: 'room-1',
                winnerPlayerId: 'player-A',
                landlordPlayerId: 'player-A',
                playersJson: playersJsonA,
                resultJson: { players: playersJsonA, actions: [], landlordPlayerId: 'player-A', winnerPlayerId: 'player-A', winMethod: 'normal', multiplier: 1, duration: 300 },
                startTime: new Date('2025-11-30 10:00:00'),
                endTime: new Date('2025-11-30 10:05:00')
            });

            await repository.createAndSave({
                roomId: 'room-2',
                winnerPlayerId: 'player-C',
                landlordPlayerId: 'player-C',
                playersJson: playersJsonC,
                resultJson: { players: playersJsonC, actions: [], landlordPlayerId: 'player-C', winnerPlayerId: 'player-C', winMethod: 'normal', multiplier: 1, duration: 400 },
                startTime: new Date('2025-11-30 11:00:00'),
                endTime: new Date('2025-11-30 11:06:40')
            });
        });

        it('should find all matches where player-A participated', async () => {
            const records = await repository.findByPlayerId('player-A', 10);

            expect(records.length).toBeGreaterThanOrEqual(1);
            const hasPlayerA = records.some(r =>
                r.playersJson.some(p => p.userId === 'player-A')
            );
            expect(hasPlayerA).toBe(true);
        });

        it('should NOT find player-C in player-A matches', async () => {
            const records = await repository.findByPlayerId('player-A', 10);

            const hasPlayerC = records.every(r =>
                r.playersJson.every(p => p.userId !== 'player-C')
            );
            expect(hasPlayerC).toBe(true);
        });
    });

    describe('DB-004: Indexed Query by roomId', () => {
        it('should query matches by roomId using index', async () => {
            const records = await repository.findByRoomId('test-room-123', 20);

            expect(Array.isArray(records)).toBe(true);
            records.forEach(record => {
                expect(record.roomId).toBe('test-room-123');
            });
        });
    });

    describe('DB-005: Date Range Query', () => {
        it('should return matches within date range', async () => {
            const startDate = new Date('2025-11-30 00:00:00');
            const endDate = new Date('2025-11-30 23:59:59');

            const records = await repository.findByDateRange(startDate, endDate);

            expect(Array.isArray(records)).toBe(true);
            records.forEach(record => {
                expect(record.startTime.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
                expect(record.startTime.getTime()).toBeLessThanOrEqual(endDate.getTime());
            });
        });
    });

    describe('DB-006: JSON Data Integrity', () => {
        it('should preserve JSON structure after insert/retrieve', async () => {
            const playersJson: PlayerSnapshot[] = [
                { userId: 'test-user', username: 'Tester', role: 'landlord', finalHand: ['♠K', '♥Q'], score: 150, handCount: 2 }
            ];

            const resultJson: MatchResultData = {
                players: playersJson,
                actions: [{ type: 'PLAY', playerId: 'test-user', cards: ['♠3'], timestamp: 5000 }],
                landlordPlayerId: 'test-user',
                winnerPlayerId: 'test-user',
                winMethod: 'bomb',
                multiplier: 4,
                duration: 600
            };

            const saved = await repository.createAndSave({
                roomId: 'integrity-test',
                winnerPlayerId: 'test-user',
                landlordPlayerId: 'test-user',
                playersJson,
                resultJson,
                startTime: new Date(),
                endTime: new Date()
            });

            const retrieved = await repository.findById(saved.id);

            expect(retrieved).toBeDefined();
            expect(retrieved!.playersJson).toEqual(playersJson);
            expect(retrieved!.resultJson).toEqual(resultJson);
            expect(retrieved!.resultJson.winMethod).toBe('bomb');
            expect(retrieved!.resultJson.multiplier).toBe(4);
        });
    });
});
