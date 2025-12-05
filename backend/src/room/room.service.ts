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

    private getSeatsKey(roomId: string): string {
        return `room:${roomId}:seats`; // Value: { userId, nickname, isBot, ready, ... }
    }

    private getRedisClient(): Redis {
        if (!this.redisClient) {
            throw new Error('Redis client not initialized');
        }
        return this.redisClient;
    }

    /**
     * Helper: Get all active room IDs
     */
    async getAllRoomIds(): Promise<string[]> {
        const client = this.getRedisClient();
        try {
            if (typeof client.keys !== 'function') {
                this.logger.error('Redis client does not have keys() method.');
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
        const seatsKey = this.getSeatsKey(roomId);

        // 1. Check if room exists
        const metaExists = await client.exists(metaKey);
        if (!metaExists) {
            await this.createRoom(roomId, user.id);
        }

        // 2. Check if player already in room (idempotency)
        const currentSeats = await client.hgetall(seatsKey);
        for (const [seatIndex, playerData] of Object.entries(currentSeats)) {
            const p = JSON.parse(playerData) as RoomPlayer;
            if (p.userId === user.id) {
                // Update online status
                p.online = true;
                p.lastActive = Date.now();
                await client.hset(seatsKey, seatIndex, JSON.stringify(p));
                return await this.getPlayers(roomId);
            }
        }

        // 3. Find first empty seat (0-3)
        let targetSeat = -1;
        for (let i = 0; i < 4; i++) {
            if (!currentSeats[i.toString()]) {
                targetSeat = i;
                break;
            }
        }

        if (targetSeat === -1) {
            throw new BadRequestException('Room is full');
        }

        // 4. Add player to seat
        const newPlayer: RoomPlayer = {
            userId: user.id,
            seat: targetSeat,
            nickname: user.nickname,
            avatar: user.avatar,
            online: true,
            ready: false,
            lastActive: Date.now(),
            // @ts-ignore
            isBot: false
        };

        await client.hset(seatsKey, targetSeat.toString(), JSON.stringify(newPlayer));
        this.logger.log(`Player ${user.id} joined room ${roomId} at seat ${targetSeat}`);

        return await this.getPlayers(roomId);
    }

    /**
     * Leave a room
     */
    async leaveRoom(roomId: string, userId: string): Promise<void> {
        const client = this.getRedisClient();
        const seatsKey = this.getSeatsKey(roomId);
        const metaKey = this.getMetaKey(roomId);

        // 1. Find seat
        const currentSeats = await client.hgetall(seatsKey);
        let seatIndexToRemove = -1;

        for (const [idx, data] of Object.entries(currentSeats)) {
            const p = JSON.parse(data) as RoomPlayer;
            if (p.userId === userId) {
                seatIndexToRemove = parseInt(idx);
                break;
            }
        }

        if (seatIndexToRemove !== -1) {
            await client.hdel(seatsKey, seatIndexToRemove.toString());
            this.logger.log(`Player ${userId} left room ${roomId} (Seat ${seatIndexToRemove})`);
        }

        // 2. Check remaining players
        const remainingCount = await client.hlen(seatsKey);
        if (remainingCount === 0) {
            await this.destroyRoom(roomId);
            return;
        }

        // 3. Handle Owner Transfer
        const ownerId = await client.hget(metaKey, 'ownerId');
        if (ownerId === userId) {
            // Get updated list to pick new owner
            const players = await this.getPlayers(roomId);
            if (players.length > 0) {
                const newOwner = players[0];
                await client.hset(metaKey, 'ownerId', newOwner.userId);
                this.logger.log(`Room ${roomId} owner transferred to ${newOwner.userId}`);
            }
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
        const seatsKey = this.getSeatsKey(roomId);

        // Find player by scanning seats
        const currentSeats = await client.hgetall(seatsKey);
        for (const [idx, data] of Object.entries(currentSeats)) {
            const p = JSON.parse(data) as RoomPlayer;
            if (p.userId === userId) {
                p.ready = isReady;
                await client.hset(seatsKey, idx, JSON.stringify(p));
                return await this.getPlayers(roomId);
            }
        }

        throw new BadRequestException('Player not in room');
    }

    /**
     * Try to start game (With PVE Auto-fill)
     */
    async tryStartGame(roomId: string): Promise<boolean> {
        const client = this.getRedisClient();
        const seatsKey = this.getSeatsKey(roomId);

        // 1. Get current real players
        const seatsMap = await client.hgetall(seatsKey);
        const realPlayers: RoomPlayer[] = Object.values(seatsMap).map(s => JSON.parse(s));

        // Condition: At least 1 real player and ALL real players must be ready
        if (realPlayers.length === 0) return false;
        const allRealReady = realPlayers.every(p => p.ready);
        if (!allRealReady) return false;

        // 2. Auto-fill Bots for empty seats (0-3)
        const filledSeats: RoomPlayer[] = [];

        for (let i = 0; i < 4; i++) {
            const seatStr = i.toString();
            if (seatsMap[seatStr]) {
                filledSeats.push(JSON.parse(seatsMap[seatStr]));
            } else {
                // Create Bot
                const botId = `bot-${Date.now()}-${i}`;
                const bot: RoomPlayer = {
                    userId: botId,
                    seat: i,
                    nickname: `Bot ${i}`,
                    avatar: 'bot_avatar_url', // TODO: Add bot avatar
                    online: true,
                    ready: true,
                    lastActive: Date.now(),
                    // @ts-ignore
                    isBot: true
                };
                await client.hset(seatsKey, seatStr, JSON.stringify(bot));
                filledSeats.push(bot);
                // Note: Ideally we should broadcast 'player_joined' here, but Gateway handles polling/updates usually.
                this.logger.log(`Auto-filled Seat ${i} with Bot ${botId}`);
            }
        }

        // Start Game
        const metaKey = this.getMetaKey(roomId);
        await client.hset(metaKey, 'status', 'playing');

        // Initialize Game Engine
        const gameContext = this.gameManager.getOrCreateRoom(roomId);

        // Map RoomPlayers to GamePlayers
        gameContext.roomData.players = filledSeats.sort((a, b) => a.seat - b.seat).map(p => ({
            id: p.userId,
            name: p.nickname,
            hand: [],
            isReady: true,
            role: undefined,
            handCount: 0,
            // @ts-ignore
            isBot: p.isBot || false,
            seatIndex: p.seat // Pass seat index to game engine
        }));

        // Trigger Init State
        gameContext.initialize();

        this.logger.log(`Game started in room ${roomId} with ${realPlayers.length} Players and ${4 - realPlayers.length} Bots`);
        return true;
    }

    /**
     * Request Rematch
     */
    async requestRematch(roomId: string): Promise<void> {
        const client = this.getRedisClient();
        const metaKey = this.getMetaKey(roomId);
        const seatsKey = this.getSeatsKey(roomId);

        // Reset Room Status
        await client.hset(metaKey, 'status', 'waiting');

        // Reset All Players Ready Status & Remove Bots
        const seatsMap = await client.hgetall(seatsKey);
        for (const [idx, data] of Object.entries(seatsMap)) {
            const p = JSON.parse(data) as RoomPlayer & { isBot?: boolean };

            if (p.isBot) {
                // Remove Bot
                await client.hdel(seatsKey, idx);
            } else {
                // Unready Real Player
                p.ready = false;
                await client.hset(seatsKey, idx, JSON.stringify(p));
            }
        }

        // Cleanup Game Engine
        this.gameManager.removeRoom(roomId);
        this.logger.log(`Room ${roomId} reset for rematch (Bots removed)`);
    }

    /**
     * Helper: Create Room
     */
    async createRoom(roomId: string, ownerId: string, config: any = {}): Promise<void> {
        const client = this.getRedisClient();
        if (!client) throw new Error('Redis client not available');

        const metaKey = this.getMetaKey(roomId);
        const seatsKey = this.getSeatsKey(roomId);

        // Use field-value pairs format
        await client.hset(metaKey, 'ownerId', ownerId);
        await client.hset(metaKey, 'status', 'waiting');
        await client.hset(metaKey, 'config', JSON.stringify(config));

        // Set expiry (24h)
        await client.expire(metaKey, 86400);
        await client.expire(seatsKey, 86400);

        this.logger.log(`Room ${roomId} created by ${ownerId}`);
    }

    /**
     * Helper: Get all players (sorted by seat)
     */
    async getPlayers(roomId: string): Promise<RoomPlayer[]> {
        const client = this.getRedisClient();
        const seatsMap = await client.hgetall(this.getSeatsKey(roomId));
        const players = Object.values(seatsMap).map((p: string) => JSON.parse(p));
        return players.sort((a, b) => a.seat - b.seat);
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
        const seatsKey = this.getSeatsKey(roomId);

        // Scan seats to find user
        const seatsMap = await client.hgetall(seatsKey);
        for (const [idx, data] of Object.entries(seatsMap)) {
            const p = JSON.parse(data) as RoomPlayer;
            if (p.userId === userId) {
                p.online = online;
                if (online) p.lastActive = Date.now();
                await client.hset(seatsKey, idx, JSON.stringify(p));
                return;
            }
        }
    }

    async updateLastActive(roomId: string, userId: string): Promise<void> {
        const client = this.getRedisClient();
        const seatsKey = this.getSeatsKey(roomId);

        const seatsMap = await client.hgetall(seatsKey);
        for (const [idx, data] of Object.entries(seatsMap)) {
            const p = JSON.parse(data) as RoomPlayer;
            if (p.userId === userId) {
                p.lastActive = Date.now();
                await client.hset(seatsKey, idx, JSON.stringify(p));
                return;
            }
        }
    }

    async destroyRoom(roomId: string): Promise<void> {
        const client = this.getRedisClient();
        const metaKey = this.getMetaKey(roomId);
        const seatsKey = this.getSeatsKey(roomId);

        await client.del(metaKey);
        await client.del(seatsKey);
        this.gameManager.removeRoom(roomId);
        this.logger.log(`Room ${roomId} destroyed`);
    }
}
