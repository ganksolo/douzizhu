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
    async guestLogin() {
        const user = await this.userService.createGuest();
        const payload = { username: user.nickname, sub: user.id };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                nickname: user.nickname,
                avatar: user.avatar,
                auth_type: user.auth_type,
            }
        };
    }

    /**
     * Validate user from payload (Optional, if we need DB check)
     */
    async validateUser(userId: string): Promise<User | null> {
        return await this.userService.findById(userId);
    }
}
