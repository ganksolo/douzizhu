import { Test, TestingModule } from '@nestjs/testing';
import { MatchController } from './match.controller';
import { MatchRepository } from './match.repository';
import { NotFoundException } from '@nestjs/common';

describe('MatchController (Phase 19.3 Unit Tests)', () => {
    let controller: MatchController;
    let repository: MatchRepository;

    const mockMatchRecord = {
        id: '123',
        roomId: 'room-1',
        winnerPlayerId: 'p1',
        startTime: new Date(),
        endTime: new Date(),
    };

    const mockRepository = {
        findByPlayerId: jest.fn(),
        findById: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MatchController],
            providers: [
                {
                    provide: MatchRepository,
                    useValue: mockRepository,
                },
            ],
        }).compile();

        controller = module.get<MatchController>(MatchController);
        repository = module.get<MatchRepository>(MatchRepository);
    });

    describe('getPlayerHistory', () => {
        it('should return match history for a player', async () => {
            mockRepository.findByPlayerId.mockResolvedValue([mockMatchRecord]);

            const result = await controller.getPlayerHistory('p1', 10);

            expect(result).toEqual([mockMatchRecord]);
            expect(repository.findByPlayerId).toHaveBeenCalledWith('p1', 10);
        });

        it('should cap limit at 50', async () => {
            mockRepository.findByPlayerId.mockResolvedValue([]);

            await controller.getPlayerHistory('p1', 100);

            expect(repository.findByPlayerId).toHaveBeenCalledWith('p1', 50);
        });
    });

    describe('getMatchDetail', () => {
        it('should return match detail by ID', async () => {
            mockRepository.findById.mockResolvedValue(mockMatchRecord);

            const result = await controller.getMatchDetail('123');

            expect(result).toEqual(mockMatchRecord);
            expect(repository.findById).toHaveBeenCalledWith('123');
        });

        it('should throw NotFoundException if match not found', async () => {
            mockRepository.findById.mockResolvedValue(null);

            await expect(controller.getMatchDetail('999')).rejects.toThrow(NotFoundException);
        });
    });
});
