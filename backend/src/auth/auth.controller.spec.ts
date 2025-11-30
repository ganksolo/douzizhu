import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

describe('AuthController (Phase 20.2 Unit Tests)', () => {
    let controller: AuthController;
    let authService: AuthService;

    const mockAuthService = {
        guestLogin: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        })
            .overrideGuard(AuthGuard('jwt'))
            .useValue({ canActivate: jest.fn(() => true) })
            .compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);
    });

    describe('guestLogin', () => {
        it('should return JWT token and user info', async () => {
            const mockResult = {
                access_token: 'mock_token',
                user: { id: '1', nickname: 'Guest', avatar: 'url', auth_type: 'guest' },
            };
            mockAuthService.guestLogin.mockResolvedValue(mockResult);

            const result = await controller.guestLogin();

            expect(result).toEqual(mockResult);
            expect(authService.guestLogin).toHaveBeenCalled();
        });
    });

    describe('getProfile', () => {
        it('should return user from request object', () => {
            const req = { user: { userId: '1', username: 'Guest' } };
            const result = controller.getProfile(req);
            expect(result).toEqual(req.user);
        });
    });
});
