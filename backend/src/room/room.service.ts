import { Injectable, Inject, Logger, BadRequestException, ForbiddenException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Socket } from 'socket.io';
// import { GameGateway } from '../game/game.gateway'; // Circular dependency risk or missing export?
// The user code seems to have GameGateway in '../game/game.gateway' based on previous view_file, 
// but wait, I saw 'GameGateway' in logs before? 
// Let's look at `game.module.ts` exports or `game.gateway.ts` location.
// Actually, `RoomService` had `GameManagerService` import before.
import { GameManagerService } from '../game/services/game-manager.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RoomMeta {
    ownerId: string;
    status: 'waiting' | 'playing';
    config: string; // JSON string
}

export interface RoomPlayer {
    userId: string;
    seat: number;
    nickname: string;
    avatar: string;
    online: boolean;
    ready: boolean;
    lastActive: number;
}

@Injectable()
export class RoomService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RoomService.name);
    private redisClient: Redis;

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        // private gameGateway: GameGateway, // Temporarily remove if not used or path invalid
        private gameManager: GameManagerService,
        private configService: ConfigService,
    ) { }

    onModuleInit() {
        // [Plan A] Direct Redis Connection to bypass CacheModule issues
        const host = this.configService.get<string>('REDIS_HOST', 'localhost');
        const port = this.configService.get<number>('REDIS_PORT', 6379);
        const password = this.configService.get<string>('REDIS_PASSWORD');

        this.redisClient = new Redis({
            host,
            port,
            password,
            retryStrategy: (times) => Math.min(times * 50, 2000),
        });

        this.redisClient.on('error', (err) => {
            this.logger.error('Redis Client Error:', err);
        });

        this.logger.log(`RoomService connected to Redis at ${host}:${port}`);
    }

    onModuleDestroy() {
        if (this.redisClient) {
            this.redisClient.disconnect();
        }
    }

    private getMetaKey(roomId: string): string {
        return `room:${roomId}:meta`;
    }

    private getPlayersKey(roomId: string): string {
        return `room:${roomId}:players`;
    }

    private getRedisClient(): Redis {
        if (!this.redisClient) {
            throw new Error('Redis client not initialized');
        }
        return this.redisClient;
    }

    /**
     * Helper: Get all active room IDs
     * Used by AFKService and RoomCleanerService
     */
    async getAllRoomIds(): Promise<string[]> {
        const client = this.getRedisClient();
        // In production, use SCAN. For now, KEYS is acceptable for prototype.
        try {
            if (typeof client.keys !== 'function') {
                this.logger.error('Redis client does not have keys() method. Keys available: ' + Object.keys(client));
                throw new Error('Redis client does not have keys() method');
            }
            const keys = await client.keys('room:*:meta');
            return keys.map((key: string) => key.split(':')[1]);
        } catch (e) {
            this.logger.error('Error in getAllRoomIds: ' + e.message);
            return [];
        }
    }
    /**
     * Join a room
     */
    async joinRoom(roomId: string, user: { id: string; nickname: string; avatar: string }, socket: Socket): Promise<RoomPlayer[]> {
        const client = this.getRedisClient();
        if (!client) throw new Error('Redis client not available');

        const metaKey = this.getMetaKey(roomId);
        const playersKey = this.getPlayersKey(roomId);

        // 1. Check if room exists
        const metaExists = await client.exists(metaKey);
        if (!metaExists) {
            // Create room if not exists (Auto-create for now)
            await this.createRoom(roomId, user.id);
        }

        // 2. Check if player already in room
        const existingPlayerData = await client.hget(playersKey, user.id);
        if (existingPlayerData) {
            // Update online status
            const player: RoomPlayer = JSON.parse(existingPlayerData);
            player.online = true;
            player.lastActive = Date.now();
            await client.hset(playersKey, user.id, JSON.stringify(player));
            return await this.getPlayers(roomId);
        }

        // 3. Check if room is full (Max 3 for Doudizhu)
        const playerCount = await client.hlen(playersKey);
        if (playerCount >= 3) {
            throw new BadRequestException('Room is full');
        }

        // 4. Assign seat (simple logic: find first empty 0, 1, 2)
        const players = await this.getPlayers(roomId);
        const takenSeats = players.map(p => p.seat);
        let seat = 0;
        while (takenSeats.includes(seat)) seat++;

        // 5. Add player
        const newPlayer: RoomPlayer = {
            userId: user.id,
            seat,
            nickname: user.nickname,
            avatar: user.avatar,
            online: true,
            ready: false,
            lastActive: Date.now(),
        };

        await client.hset(playersKey, user.id, JSON.stringify(newPlayer));
        this.logger.log(`Player ${user.id} joined room ${roomId} at seat ${seat}`);

        return await this.getPlayers(roomId);
    }

    /**
     * Leave a room
     */
    async leaveRoom(roomId: string, userId: string): Promise<void> {
        const client = this.getRedisClient();
        const playersKey = this.getPlayersKey(roomId);
        const metaKey = this.getMetaKey(roomId);

        // 1. Remove player
        await client.hdel(playersKey, userId);
        this.logger.log(`Player ${userId} left room ${roomId}`);

        // 2. Check remaining players
        const remainingPlayers = await this.getPlayers(roomId);
        if (remainingPlayers.length === 0) {
            // Destroy room if empty
            await client.del(metaKey);
            await client.del(playersKey);
            this.logger.log(`Room ${roomId} destroyed (empty)`);
            return;
        }

        // 3. Handle Owner Transfer
        const ownerId = await client.hget(metaKey, 'ownerId');
        if (ownerId === userId) {
            const newOwner = remainingPlayers[0]; // Simple transfer to first remaining
            await client.hset(metaKey, 'ownerId', newOwner.userId);
            this.logger.log(`Room ${roomId} owner transferred to ${newOwner.userId}`);
        }
    }

    /**
     * Kick a player
     */
    async kickPlayer(roomId: string, ownerId: string, targetId: string): Promise<void> {
        const client = this.getRedisClient();
        const metaKey = this.getMetaKey(roomId);

        // 1. Verify Owner
        const currentOwner = await client.hget(metaKey, 'ownerId');
        if (ownerId !== 'system' && currentOwner !== ownerId) {
            throw new ForbiddenException('Only owner can kick players');
        }

        // 2. Execute Leave
        await this.leaveRoom(roomId, targetId);
    }

    /**
     * Toggle Ready Status
     */
    async toggleReady(roomId: string, userId: string, isReady: boolean): Promise<RoomPlayer[]> {
        const client = this.getRedisClient();
        const playersKey = this.getPlayersKey(roomId);

        const playerData = await client.hget(playersKey, userId);
        if (!playerData) throw new BadRequestException('Player not in room');

        const player: RoomPlayer = JSON.parse(playerData);
        player.ready = isReady;

        await client.hset(playersKey, userId, JSON.stringify(player));

        return await this.getPlayers(roomId);
    }

    /**
     * Try to start game
     */
    async tryStartGame(roomId: string): Promise<boolean> {
        const client = this.getRedisClient();
        const players = await this.getPlayers(roomId);

        // Condition: 3 players (for now) and all ready
        if (players.length < 3) return false;
        const allReady = players.every(p => p.ready);
        if (!allReady) return false;

        // Start Game
        const metaKey = this.getMetaKey(roomId);
        await client.hset(metaKey, 'status', 'playing');

        // Initialize Game Engine
        const gameContext = this.gameManager.getOrCreateRoom(roomId);

        // Map RoomPlayers to GamePlayers
        gameContext.roomData.players = players.map(p => ({
            id: p.userId,
            name: p.nickname,
            hand: [],
            isReady: true,
            role: undefined, // Will be set in CallLandlord
            handCount: 0
        }));

        // Trigger Init State
        gameContext.initialize();

        this.logger.log(`Game started in room ${roomId}`);
        return true;
    }

    /**
     * Request Rematch
     */
    async requestRematch(roomId: string): Promise<void> {
        const client = this.getRedisClient();
        const metaKey = this.getMetaKey(roomId);
        const playersKey = this.getPlayersKey(roomId);

        // Reset Room Status
        await client.hset(metaKey, 'status', 'waiting');

        // Reset All Players Ready Status
        const players = await this.getPlayers(roomId);
        for (const player of players) {
            player.ready = false;
            await client.hset(playersKey, player.userId, JSON.stringify(player));
        }

        // Cleanup Game Engine
        this.gameManager.removeRoom(roomId);

        this.logger.log(`Room ${roomId} reset for rematch`);
    }

    /**
     * Helper: Create Room
     */
    async createRoom(roomId: string, ownerId: string, config: any = {}): Promise<void> {
        const client = this.getRedisClient();
        if (!client) throw new Error('Redis client not available');

        const metaKey = this.getMetaKey(roomId);

        // Use field-value pairs format instead of object
        await client.hset(metaKey, 'ownerId', ownerId);
        await client.hset(metaKey, 'status', 'waiting');
        await client.hset(metaKey, 'config', JSON.stringify(config));

        // Set expiry for cleanup (24h)
        await client.expire(metaKey, 86400);
        await client.expire(this.getPlayersKey(roomId), 86400);

        this.logger.log(`Room ${roomId} created by ${ownerId}`);
    }

    /**
     * Helper: Get all players
     */
    async getPlayers(roomId: string): Promise<RoomPlayer[]> {
        const client = this.getRedisClient();
        const playersMap = await client.hgetall(this.getPlayersKey(roomId));
        return Object.values(playersMap).map((p: string) => JSON.parse(p));
    }

    /**
     * Helper: Get Room Meta
     */
    async getRoomMeta(roomId: string): Promise<RoomMeta | null> {
        const client = this.getRedisClient();
        const meta = await client.hgetall(this.getMetaKey(roomId));
        if (!meta || Object.keys(meta).length === 0) return null;
        return meta as unknown as RoomMeta;
    }

    // --- Resilience Methods ---

    async setPlayerOnline(roomId: string, userId: string, online: boolean): Promise<void> {
        const client = this.getRedisClient();
        const playersKey = this.getPlayersKey(roomId);
        const playerData = await client.hget(playersKey, userId);
        if (playerData) {
            const player: RoomPlayer = JSON.parse(playerData);
            player.online = online;
            if (online) player.lastActive = Date.now();
            await client.hset(playersKey, userId, JSON.stringify(player));
        }
    }

    async updateLastActive(roomId: string, userId: string): Promise<void> {
        const client = this.getRedisClient();
        const playersKey = this.getPlayersKey(roomId);
        const playerData = await client.hget(playersKey, userId);
        if (playerData) {
            const player: RoomPlayer = JSON.parse(playerData);
            player.lastActive = Date.now();
            await client.hset(playersKey, userId, JSON.stringify(player));
        }
    }



    async destroyRoom(roomId: string): Promise<void> {
        const client = this.getRedisClient();
        const metaKey = this.getMetaKey(roomId);
        const playersKey = this.getPlayersKey(roomId);

        await client.del(metaKey);
        await client.del(playersKey);
        this.gameManager.removeRoom(roomId); // Ensure game context is also cleaned
        this.logger.log(`Room ${roomId} destroyed`);
    }
}
