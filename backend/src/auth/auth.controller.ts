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
    getProfile(@Request() req) {
        return req.user;
    }

}
