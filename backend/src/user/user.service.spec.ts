import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { MatchRepository } from '../game/match/match.repository';
import { AuthType } from './user.entity';
import { NotFoundException } from '@nestjs/common';

describe('UserService (Phase 20.3 Unit Tests)', () => {
    let service: UserService;
    let userRepository: UserRepository;
    let matchRepository: MatchRepository;

    const mockUser = {
        id: '1',
        nickname: 'TestUser',
        auth_type: AuthType.GUEST,
        avatar: 'avatar.png',
        lastLogin: new Date(),
    };

    const mockUserRepository = {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
    };

    const mockMatchRepository = {
        getPlayerStats: jest.fn(),
        findByPlayerId: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: UserRepository, useValue: mockUserRepository },
                { provide: MatchRepository, useValue: mockMatchRepository },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        userRepository = module.get<UserRepository>(UserRepository);
        matchRepository = module.get<MatchRepository>(MatchRepository);
    });

    describe('createGuest', () => {
        it('should create a guest user with random nickname', async () => {
            mockUserRepository.create.mockResolvedValue(mockUser);

            const result = await service.createGuest();

            expect(result).toEqual(mockUser);
            expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                auth_type: AuthType.GUEST,
                nickname: expect.stringMatching(/^Guest-\d{4}$/),
            }));
        });
    });

    describe('findById', () => {
        it('should return user if found', async () => {
            mockUserRepository.findById.mockResolvedValue(mockUser);
            const result = await service.findById('1');
            expect(result).toEqual(mockUser);
        });

        it('should throw NotFoundException if user not found', async () => {
            mockUserRepository.findById.mockResolvedValue(null);
            await expect(service.findById('999')).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateProfile', () => {
        it('should update and return user', async () => {
            mockUserRepository.update.mockResolvedValue(undefined);
            mockUserRepository.findById.mockResolvedValue({ ...mockUser, nickname: 'NewName' });

            const result = await service.updateProfile('1', { nickname: 'NewName' });

            expect(userRepository.update).toHaveBeenCalledWith('1', { nickname: 'NewName' });
            expect(result.nickname).toBe('NewName');
        });
    });

    describe('getUserStats', () => {
        it('should return aggregated stats', async () => {
            const mockStats = { totalMatches: 10, totalWins: 5 };
            const mockMatches = [{ id: '101' }];

            mockUserRepository.findById.mockResolvedValue(mockUser);
            mockMatchRepository.getPlayerStats.mockResolvedValue(mockStats);
            mockMatchRepository.findByPlayerId.mockResolvedValue(mockMatches);

            const result = await service.getUserStats('1');

            expect(result).toEqual({
                user: {
                    id: mockUser.id,
                    nickname: mockUser.nickname,
                    avatar: mockUser.avatar,
                },
                stats: {
                    totalMatches: 10,
                    totalWins: 5,
                    winRate: 0.5,
                },
                recentMatches: mockMatches,
            });
        });
    });
});
