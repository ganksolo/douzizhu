import { Test, TestingModule } from '@nestjs/testing';
import { MatchService } from './match.service';
import { MatchRepository } from '../match/match.repository';
import { RoomData } from '../types/game.types';

describe('MatchService', () => {
    let service: MatchService;
    let repository: MatchRepository;

    const mockRepository = {
        createAndSave: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MatchService,
                {
                    provide: MatchRepository,
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<MatchService>(MatchService);
        repository = module.get<MatchRepository>(MatchRepository);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('saveMatchResult', () => {
        it('should transform data and call repository.createAndSave', async () => {
            const startTime = new Date('2025-01-01T10:00:00Z');
            const roomData: RoomData = {
                roomId: 'room-123',
                players: [
                    { id: 'p1', name: 'Landlord', role: 'landlord', hand: [], isReady: true },
                    { id: 'p2', name: 'Peasant1', role: 'peasant', hand: ['3'], isReady: true },
                    { id: 'p3', name: 'Peasant2', role: 'peasant', hand: ['4'], isReady: true },
                ],
                deck: [],
                landlordId: 'p1',
                multiplier: 2,
                actionHistory: [],
            };

            mockRepository.createAndSave.mockResolvedValue({ id: '1' });

            await service.saveMatchResult(roomData, 'p1', startTime);

            expect(mockRepository.createAndSave).toHaveBeenCalledTimes(1);
            const callArg = mockRepository.createAndSave.mock.calls[0][0];

            // Verify transformation
            expect(callArg.roomId).toBe('room-123');
            expect(callArg.winnerPlayerId).toBe('p1');
            expect(callArg.playersJson).toHaveLength(3);

            // Verify score calculation (Landlord wins x2)
            // Base 100 * 2 = 200 for landlord
            expect(callArg.playersJson[0].score).toBe(200);

            expect(callArg.resultJson.winMethod).toBe('normal');
        });
    });
});
