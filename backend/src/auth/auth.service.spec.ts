import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { AuthType } from '../user/user.entity';

describe('AuthService (Phase 20.2 Unit Tests)', () => {
    let service: AuthService;
    let userService: UserService;
    let jwtService: JwtService;

    const mockUser = {
        id: '1',
        nickname: 'Guest-1234',
        avatar: 'avatar_url',
        auth_type: AuthType.GUEST,
    };

    const mockUserService = {
        createGuest: jest.fn(),
        findById: jest.fn(),
    };

    const mockJwtService = {
        sign: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UserService, useValue: mockUserService },
                { provide: JwtService, useValue: mockJwtService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        userService = module.get<UserService>(UserService);
        jwtService = module.get<JwtService>(JwtService);
    });

    describe('guestLogin', () => {
        it('should create guest user and return token', async () => {
            mockUserService.createGuest.mockResolvedValue(mockUser);
            mockJwtService.sign.mockReturnValue('mock_jwt_token');

            const result = await service.guestLogin();

            expect(userService.createGuest).toHaveBeenCalled();
            expect(jwtService.sign).toHaveBeenCalledWith({ username: mockUser.nickname, sub: mockUser.id });
            expect(result).toEqual({
                access_token: 'mock_jwt_token',
                user: {
                    id: mockUser.id,
                    nickname: mockUser.nickname,
                    avatar: mockUser.avatar,
                    auth_type: mockUser.auth_type,
                },
            });
        });
    });

    describe('validateUser', () => {
        it('should return user if found', async () => {
            mockUserService.findById.mockResolvedValue(mockUser);
            const result = await service.validateUser('1');
            expect(result).toEqual(mockUser);
        });
    });
});
