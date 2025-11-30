import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { User, AuthType } from './user.entity';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
    ) { }

    /**
     * Create a new guest user with a random nickname
     */
    async createGuest(): Promise<User> {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const nickname = `Guest-${randomSuffix}`;

        return await this.userRepository.create({
            nickname,
            auth_type: AuthType.GUEST,
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + randomSuffix,
            lastLogin: new Date(),
        });
    }

    /**
     * Find user by ID
     */
    async findById(id: string): Promise<User> {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }

    /**
     * Update user profile (nickname, avatar)
     */
    async updateProfile(id: string, data: { nickname?: string; avatar?: string }): Promise<User> {
        await this.userRepository.update(id, data);
        return this.findById(id);
    }

    /**
     * Update last login time
     */
    async updateLastLogin(id: string): Promise<void> {
        await this.userRepository.update(id, { lastLogin: new Date() });
    }
}
