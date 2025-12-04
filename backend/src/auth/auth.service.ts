import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
    ) { }

    /**
     * Login as a guest user
     * Creates a new guest account and returns JWT
     */
    /**
     * Login as a guest user
     * Creates a new guest account and returns JWT
     */
    async guestLogin() {
        const user = await this.userService.createGuest();
        return this.generateToken(user);
    }

    /**
     * Register a new user
     */
    async register(username: string, password: string, email?: string) {
        // Mock hashing for prototype (In production, use bcrypt)
        const passwordHash = `hashed_${password}`;
        const user = await this.userService.createUser(username, passwordHash, email);
        return this.generateToken(user);
    }

    /**
     * Login with username and password
     */
    async login(username: string, password: string) {
        const user = await this.userService.findByUsername(username);
        if (!user) {
            return null;
        }

        // Mock hashing check (In production, use bcrypt.compare)
        const passwordHash = `hashed_${password}`;
        if (user.passwordHash !== passwordHash) {
            return null;
        }

        return this.generateToken(user);
    }

    private generateToken(user: User) {
        const payload = { username: user.nickname, sub: user.id };
        return {
            success: true,
            data: {
                userId: user.id,
                username: user.nickname,
                token: this.jwtService.sign(payload),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            }
        };
    }

    /**
     * Validate user from payload (Optional, if we need DB check)
     */
    async validateUser(userId: string): Promise<User | null> {
        return await this.userService.findById(userId);
    }

    /**
     * Verify JWT token and return payload
     */
    verifyToken(token: string): any {
        try {
            return this.jwtService.verify(token);
        } catch (e) {
            return null;
        }
    }
}
