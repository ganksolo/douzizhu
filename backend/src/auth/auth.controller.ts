import { Controller, Post, Get, UseGuards, Request, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    /**
     * Guest Login
     * POST /auth/guest-login
     */
    /**
     * Guest Login
     * POST /auth/guest-login
     */
    @Post('guest-login')
    async guestLogin() {
        return this.authService.guestLogin();
    }

    /**
     * Register
     * POST /auth/register
     */
    @Post('register')
    async register(@Body() body: any) {
        return this.authService.register(body.username, body.password, body.email);
    }

    /**
     * Login
     * POST /auth/login
     */
    @Post('login')
    async login(@Body() body: any) {
        return this.authService.login(body.username, body.password);
    }

    /**
     * Get Current User Profile (Protected)
     * GET /auth/me
     */
    @UseGuards(AuthGuard('jwt'))
    @Get('me')
    async getProfile(@Request() req) {
        // req.user has { userId, username } from JwtStrategy
        // Fetch full profile from DB to get avatar, stats, etc.
        const user = await this.authService.validateUser(req.user.userId);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Map to response format
        return {
            success: true,
            data: {
                userId: user.id,
                username: user.nickname,
                avatar: user.avatar,
                email: user.email,
                createdAt: user.createdAt,
            }
        };
    }

}
