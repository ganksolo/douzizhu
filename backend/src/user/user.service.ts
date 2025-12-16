import { Injectable, NotFoundException, ConflictException, OnModuleInit, Logger } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { User, AuthType } from './user.entity';
import { MatchRepository } from '../game/match/match.repository';

@Injectable()
export class UserService implements OnModuleInit {
    private logger = new Logger(UserService.name);

    onModuleInit() {
        this.logger.log(`[UserService] DB CONFIG CHECK: Host=${process.env.DATABASE_HOST}, Port=${process.env.DATABASE_PORT}, DB=${process.env.DATABASE_NAME}, User=${process.env.DATABASE_USER}`);
    }

    constructor(
        private readonly userRepository: UserRepository,
        private readonly matchRepository: MatchRepository,
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
     * Create a new user with username and password
     */
    async createUser(username: string, passwordHash: string, email?: string): Promise<User> {
        // Check if username exists
        const existing = await this.userRepository.findByNickname(username);
        if (existing) {
            throw new ConflictException('Username already exists');
        }

        return await this.userRepository.create({
            nickname: username,
            auth_type: AuthType.PASSWORD,
            passwordHash: passwordHash,
            email: email,
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + username,
            lastLogin: new Date(),
            coins: 10000, // Registered User Default
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
     * Find user by username
     */
    async findByUsername(username: string): Promise<User | null> {
        return await this.userRepository.findByNickname(username);
    }

    /**
     * Find user for authentication (includes password hash)
     */
    async findForAuth(username: string): Promise<User | null> {
        return await this.userRepository.findWithPassword(username);
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

    /**
     * Get user statistics
     */
    async getUserStats(userId: string) {
        const user = await this.findById(userId);
        const stats = await this.matchRepository.getPlayerStats(userId);
        const recentMatches = await this.matchRepository.findByPlayerId(userId, 10);

        return {
            user: {
                id: user.id,
                nickname: user.nickname,
                avatar: user.avatar,
                coins: user.coins, // Return coins
            },
            stats: {
                totalMatches: stats.totalMatches,
                totalWins: stats.totalWins,
                winRate: stats.totalMatches > 0 ? (stats.totalWins / stats.totalMatches) : 0,
            },
            recentMatches,
        };
    }
}
