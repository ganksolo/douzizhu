import { Test, TestingModule } from '@nestjs/testing';
import { MatchService } from './match.service';
import { MatchRepository } from '../match/match.repository';
import { RoomData, Player, ActionType } from '../types/game.types';

describe('MatchService (Phase 19.2 Unit Tests)', () => {
    let service: MatchService;
    let repository: MatchRepository;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MatchService,
                {
                    provide: MatchRepository,
                    useValue: {
                        createAndSave: jest.fn().mockResolvedValue({ id: '123' }),
                    },
                },
            ],
        }).compile();

        service = module.get<MatchService>(MatchService);
        repository = module.get<MatchRepository>(MatchRepository);
    });

    const createMockRoomData = (winnerId: string, landlordId: string): RoomData => ({
        roomId: 'room-1',
        deck: [], // Mock empty deck
        players: [
            { id: 'p1', name: 'Player1', role: 'landlord', hand: [], handCount: 0, isReady: true } as Player,
            { id: 'p2', name: 'Player2', role: 'peasant', hand: ['♠3'], handCount: 1, isReady: true } as Player,
            { id: 'p3', name: 'Player3', role: 'peasant', hand: ['♥4'], handCount: 1, isReady: true } as Player,
            { id: 'p4', name: 'Player4', role: 'peasant', hand: ['♦5'], handCount: 1, isReady: true } as Player,
        ],
        currentTurn: 'p1',
        landlordId,
        multiplier: 2,
        actionHistory: [
            { timestamp: 1000, playerId: 'p1', type: ActionType.PLAY, payload: { cards: ['♠A'] } }
        ],
        startTime: new Date(Date.now() - 60000), // 1 min ago
    });

    describe('transformToMatchRecord', () => {
        it('should transform RoomData to MatchRecord DTO correctly', () => {
            const roomData = createMockRoomData('p1', 'p1');
            const startTime = roomData.startTime!;
            const endTime = new Date();

            const result = service.transformToMatchRecord(roomData, 'p1', startTime, endTime);

            expect(result.roomId).toBe('room-1');
            expect(result.winnerPlayerId).toBe('p1');
            expect(result.resultJson.winMethod).toBe('normal');
            expect(result.resultJson.multiplier).toBe(2);
            expect(result.playersJson).toHaveLength(4);
        });

        it('should calculate correct scores for Landlord Win', () => {
            const roomData = createMockRoomData('p1', 'p1');
            const result = service.transformToMatchRecord(roomData, 'p1', new Date(), new Date());

            const landlord = result.playersJson.find(p => p.userId === 'p1');
            const peasant = result.playersJson.find(p => p.userId === 'p2');

            expect(landlord!.score).toBe(200);
            expect(peasant!.score).toBeLessThan(0);
        });

        it('should calculate correct scores for Peasant Win', () => {
            const roomData = createMockRoomData('p2', 'p1');
            const result = service.transformToMatchRecord(roomData, 'p2', new Date(), new Date());

            const landlord = result.playersJson.find(p => p.userId === 'p1');
            const peasant = result.playersJson.find(p => p.userId === 'p2');

            expect(landlord!.score).toBe(-200);
            expect(peasant!.score).toBeGreaterThan(0);
        });

        it('should detect Spring (Landlord wins, peasants played NO cards)', () => {
            const roomData = createMockRoomData('p1', 'p1');
            // Mock peasants with full hands (25 cards)
            roomData.players[1].hand = new Array(25).fill('♠3');
            roomData.players[2].hand = new Array(25).fill('♠3');
            roomData.players[3].hand = new Array(25).fill('♠3');

            const result = service.transformToMatchRecord(roomData, 'p1', new Date(), new Date());

            expect(result.resultJson.winMethod).toBe('spring');
        });

        it('should detect Anti-Spring (Landlord played only 1 hand)', () => {
            const roomData = createMockRoomData('p2', 'p1'); // Peasant wins
            // Mock action history: Landlord played exactly once
            roomData.actionHistory = [
                { timestamp: 1000, playerId: 'p1', type: ActionType.PLAY, payload: { cards: ['♠3'] } },
                { timestamp: 1001, playerId: 'p2', type: ActionType.PLAY, payload: { cards: ['♠4'] } },
                // ... rest of game without p1 playing
            ];

            const result = service.transformToMatchRecord(roomData, 'p2', new Date(), new Date());

            expect(result.resultJson.winMethod).toBe('anti-spring');
        });
    });
});
