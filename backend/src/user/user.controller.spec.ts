import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

describe('UserController (Phase 20.3 Unit Tests)', () => {
    let controller: UserController;
    let userService: UserService;

    const mockStats = {
        user: { id: '1', nickname: 'Test', avatar: 'url' },
        stats: { totalMatches: 10, totalWins: 5, winRate: 0.5 },
        recentMatches: [],
    };

    const mockUserService = {
        getUserStats: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                {
                    provide: UserService,
                    useValue: mockUserService,
                },
            ],
        })
            .overrideGuard(AuthGuard('jwt'))
            .useValue({ canActivate: jest.fn(() => true) })
            .compile();

        controller = module.get<UserController>(UserController);
        userService = module.get<UserService>(UserService);
    });

    describe('getUserStats', () => {
        it('should return user stats', async () => {
            mockUserService.getUserStats.mockResolvedValue(mockStats);

            const result = await controller.getUserStats('1');

            expect(result).toEqual(mockStats);
            expect(userService.getUserStats).toHaveBeenCalledWith('1');
        });

        it('should throw NotFoundException if user not found', async () => {
            mockUserService.getUserStats.mockRejectedValue(new NotFoundException());

            await expect(controller.getUserStats('999')).rejects.toThrow(NotFoundException);
        });
    });
});
