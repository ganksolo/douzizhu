import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { AuthType } from './user.entity';
import { NotFoundException } from '@nestjs/common';

describe('UserService (Phase 20.1 Unit Tests)', () => {
    let service: UserService;
    let repository: UserRepository;

    const mockUser = {
        id: '1',
        nickname: 'TestUser',
        auth_type: AuthType.GUEST,
        avatar: 'avatar.png',
        lastLogin: new Date(),
    };

    const mockRepository = {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: UserRepository,
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        repository = module.get<UserRepository>(UserRepository);
    });

    describe('createGuest', () => {
        it('should create a guest user with random nickname', async () => {
            mockRepository.create.mockResolvedValue(mockUser);

            const result = await service.createGuest();

            expect(result).toEqual(mockUser);
            expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
                auth_type: AuthType.GUEST,
                nickname: expect.stringMatching(/^Guest-\d{4}$/),
            }));
        });
    });

    describe('findById', () => {
        it('should return user if found', async () => {
            mockRepository.findById.mockResolvedValue(mockUser);

            const result = await service.findById('1');

            expect(result).toEqual(mockUser);
        });

        it('should throw NotFoundException if user not found', async () => {
            mockRepository.findById.mockResolvedValue(null);

            await expect(service.findById('999')).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateProfile', () => {
        it('should update and return user', async () => {
            mockRepository.update.mockResolvedValue(undefined);
            mockRepository.findById.mockResolvedValue({ ...mockUser, nickname: 'NewName' });

            const result = await service.updateProfile('1', { nickname: 'NewName' });

            expect(repository.update).toHaveBeenCalledWith('1', { nickname: 'NewName' });
            expect(result.nickname).toBe('NewName');
        });
    });
});
