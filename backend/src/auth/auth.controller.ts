import { Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    /**
     * Guest Login
     * POST /auth/guest-login
     */
    @Post('guest-login')
    async guestLogin() {
        return this.authService.guestLogin();
    }

    /**
     * Get Current User Profile (Protected)
     * GET /auth/me
     */
    @UseGuards(AuthGuard('jwt'))
    @Get('me')
    getProfile(@Request() req) {
        return req.user;
    }
}
