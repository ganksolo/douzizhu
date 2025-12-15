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
    isReady: boolean;
    lastActive: number;
    isBot?: boolean;
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

    // --- Refactored RoomPlayer Interface implicitly via usage ---

    private getSeatsKey(roomId: string): string {
        return `room:${roomId}:seats`; // Value: { userId, nickname, isBot, isReady, ... }
    }

    private getRedisClient(): Redis {
        return this.redisClient;
    }

    public async getAllRoomIds(): Promise<string[]> {
        const client = this.getRedisClient();
        if (!client) return [];
        const keys = await client.keys('room:*:meta');
        return keys.map(key => key.split(':')[1]);
    }

    /**
     * Get rooms with pagination
     */
    /**
     * Get rooms with pagination (filtered by status='waiting')
     */
    async getRooms(page: number = 1, limit: number = 20): Promise<{ rooms: any[], total: number }> {
        const client = this.getRedisClient();
        const allKeys = await this.getAllRoomIds();

        // Optimization: Fetch all metas in parallel to filter
        // In a production system with millions of rooms, we would use a Redis Set for 'waiting' rooms
        // But for this scale, scanning is acceptable
        const roomMetas = await Promise.all(allKeys.map(async (roomId) => {
            const meta = await this.getRoomMeta(roomId);
            if (!meta) return null;

            // Filter: Only return WAITING rooms
            if (meta.status !== 'waiting') return null;

            return { roomId, meta };
        }));

        // Filter out nulls
        const activeRooms = roomMetas.filter(item => item !== null) as { roomId: string, meta: any }[];
        const total = activeRooms.length;

        // Pagination
        const startIndex = (page - 1) * limit;
        const pageItems = activeRooms.slice(startIndex, startIndex + limit);

        const rooms: any[] = [];
        for (const item of pageItems) {
            const { roomId, meta } = item;
            const seatsKey = this.getSeatsKey(roomId);
            const playerCount = await client.hlen(seatsKey);
            const configObj = meta.config ? JSON.parse(meta.config) : {};

            rooms.push({
                roomId,
                name: configObj.name || `Room ${roomId.substr(0, 6)}`,
                hostId: meta.ownerId,
                currentPlayers: playerCount,
                maxPlayers: configObj.maxPlayers || 4,
                status: meta.status,
                type: configObj.type || 'PVP',
                difficulty: configObj.difficulty || 'MEDIUM',
                isPrivate: configObj.isPrivate || false,
                botCount: configObj.botCount || 0,
                config: configObj
            });
        }

        return { rooms, total };
    }

    /**
     * Join a room
     */
    async joinRoom(roomId: string, user: { id: string; nickname: string; avatar?: string }, seatIndex?: number): Promise<RoomPlayer[]> {
        const client = this.getRedisClient();
        if (!client) throw new Error('Redis client not available');

        const metaKey = this.getMetaKey(roomId);
        const seatsKey = this.getSeatsKey(roomId);

        // 1. Check if room exists
        let meta = await this.getRoomMeta(roomId);
        if (!meta) {
            throw new BadRequestException('Room not found');
        }

        const config = meta.config ? JSON.parse(meta.config) : {};
        const maxPlayers = config.maxPlayers || 4;

        // 2. Check if player already in room (idempotency)
        const currentSeats = await client.hgetall(seatsKey);
        for (const [seatIndex, playerData] of Object.entries(currentSeats)) {
            const p = JSON.parse(playerData);
            if (p.userId === user.id) {
                // Update online status
                p.online = true;
                p.lastActive = Date.now();
                await client.hset(seatsKey, seatIndex, JSON.stringify(p));
                return await this.getPlayers(roomId);
            }
        }

        // 3. Find seat
        let targetSeat = -1;

        if (seatIndex !== undefined) {
            // Specific seat requested
            if (seatIndex < 0 || seatIndex >= maxPlayers) {
                throw new BadRequestException('Invalid seat index');
            }
            if (currentSeats[seatIndex.toString()]) {
                throw new BadRequestException('Seat is already taken');
            }
            targetSeat = seatIndex;
        } else {
            // Auto-assign first empty
            for (let i = 0; i < maxPlayers; i++) {
                if (!currentSeats[i.toString()]) {
                    targetSeat = i;
                    break;
                }
            }
        }

        if (targetSeat === -1) {
            throw new BadRequestException('Room is full');
        }

        // 4. Add player to seat
        const newPlayer = {
            userId: user.id,
            seat: targetSeat,
            nickname: user.nickname,
            // FIX: Use empty string if no avatar, so frontend falls back to DiceBear correctly
            avatar: user.avatar || '',
            online: true,
            isReady: false, // RENAMED from ready
            lastActive: Date.now(),
            isBot: false
        };

        await client.hset(seatsKey, targetSeat.toString(), JSON.stringify(newPlayer));
        this.logger.log(`Player ${user.id} joined room ${roomId} at seat ${targetSeat}`);

        return await this.getPlayers(roomId);
    }

    /**
    * Add an AI Bot to the room
    */
    async addBotToRoom(roomId: string): Promise<RoomPlayer> {
        const client = this.getRedisClient();
        const seatsKey = this.getSeatsKey(roomId);
        const meta = await this.getRoomMeta(roomId);
        const config = meta?.config ? JSON.parse(meta.config) : {};
        const maxPlayers = config.maxPlayers || 4;

        const currentSeats = await client.hgetall(seatsKey);

        // Find empty seat
        let targetSeat = -1;
        for (let i = 0; i < maxPlayers; i++) {
            if (!currentSeats[i.toString()]) {
                targetSeat = i;
                break;
            }
        }

        if (targetSeat === -1) {
            throw new BadRequestException('Room is full');
        }

        const botId = `bot-${Date.now()}-${targetSeat}`;
        const bot: RoomPlayer = {
            userId: botId,
            seat: targetSeat,
            nickname: `Bot ${targetSeat + 1}`,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${botId}`,
            online: true,
            isReady: true, // Bots are always ready
            lastActive: Date.now(),
            isBot: true
        };

        await client.hset(seatsKey, targetSeat.toString(), JSON.stringify(bot));
        this.logger.log(`Added Bot ${botId} to room ${roomId} at seat ${targetSeat}`);

        return bot;
    }

    /**
     * Fill all empty seats with AI bots
     * @param roomId Room ID
     * @param maxCount Optional limit on number of bots to add (default: fill all)
     * @returns Array of added bots
     */
    async fillBotsToRoom(roomId: string, maxCount?: number): Promise<RoomPlayer[]> {
        const client = this.getRedisClient();
        const seatsKey = this.getSeatsKey(roomId);
        const meta = await this.getRoomMeta(roomId);
        const config = meta?.config ? JSON.parse(meta.config) : {};
        const maxPlayers = config.maxPlayers || 4;

        const currentSeats = await client.hgetall(seatsKey);
        const currentPlayerCount = Object.keys(currentSeats).length;
        const emptySeats = maxPlayers - currentPlayerCount;

        // Determine how many bots to add
        const botsToAdd = maxCount !== undefined ? Math.min(emptySeats, maxCount) : emptySeats;

        if (botsToAdd <= 0) {
            return [];
        }

        const bots: RoomPlayer[] = [];
        for (let i = 0; i < botsToAdd; i++) {
            const bot = await this.addBotToRoom(roomId);
            bots.push(bot);
        }

        this.logger.log(`Filled ${botsToAdd} bot(s) to room ${roomId}`);
        return bots;
    }

    /**
     * Try to start game
     */
    async tryStartGame(roomId: string): Promise<boolean> {
        const client = this.getRedisClient();
        const seatsKey = this.getSeatsKey(roomId);
        const meta = await this.getRoomMeta(roomId);
        const config = meta?.config ? JSON.parse(meta.config) : { maxPlayers: 4 };
        const requiredPlayers = config.maxPlayers || 4;

        // 1. Get current players
        const seatsMap = await client.hgetall(seatsKey);
        const players: any[] = Object.values(seatsMap).map(s => JSON.parse(s));

        // Condition: Must have 'requiredPlayers' count and ALL must be ready
        if (players.length < requiredPlayers) return false;

        // Check isReady (support legacy ready field if migration needed, but assumes flush)
        const allReady = players.every(p => p.isReady || p.ready);
        if (!allReady) return false;

        // Start Game
        const metaKey = this.getMetaKey(roomId);
        await client.hset(metaKey, 'status', 'playing');

        // Initialize Game Engine
        const gameContext = this.gameManager.getOrCreateRoom(roomId);

        // Map RoomPlayers to GamePlayers
        gameContext.roomData.players = players.sort((a, b) => a.seat - b.seat).map(p => ({
            id: p.userId,
            name: p.nickname,
            hand: [],
            isReady: true,
            role: undefined,
            handCount: 0,
            isRobot: p.isBot || false,
            seatIndex: p.seat
        }));

        // Trigger Init State
        gameContext.initialize();

        this.logger.log(`Game started in room ${roomId} with ${players.length} Players`);

        return true;
    }

    // ...



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
            const p = JSON.parse(data);
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
     * Returns: { players, addedBots } where addedBots contains newly created bot info
     */
    async toggleReady(roomId: string, userId: string, isReady: boolean): Promise<{ players: RoomPlayer[], addedBots: RoomPlayer[] }> {
        const client = this.getRedisClient();
        const seatsKey = this.getSeatsKey(roomId);

        // Find player by scanning seats
        const currentSeats = await client.hgetall(seatsKey);
        for (const [idx, data] of Object.entries(currentSeats)) {
            const p = JSON.parse(data);
            if (p.userId === userId) {
                p.isReady = isReady; // Use isReady
                // Remove legacy 'ready' if exists to be clean? Or keep for safety?
                delete p.ready;

                await client.hset(seatsKey, idx, JSON.stringify(p));

                // PVE Auto-fill Logic
                const addedBots: RoomPlayer[] = [];
                const meta = await this.getRoomMeta(roomId);
                if (meta && isReady) {
                    const config = meta.config ? JSON.parse(meta.config) : {};
                    if (config.type === 'PVE') {
                        // Check empty seats
                        const freshSeats = await client.hgetall(seatsKey);
                        const maxPlayers = config.maxPlayers || 4;
                        const currentCount = Object.keys(freshSeats).length;

                        const botsNeeded = maxPlayers - currentCount;
                        if (botsNeeded > 0) {
                            this.logger.log(`PVE Auto-fill: Adding ${botsNeeded} bots to room ${roomId}`);
                            for (let i = 0; i < botsNeeded; i++) {
                                const bot = await this.addBotToRoom(roomId);
                                addedBots.push(bot);
                            }

                            // PVE Auto-start: Try to start the game after all bots join
                            this.logger.log(`PVE Auto-start: Attempting to start game in room ${roomId}`);
                            await this.tryStartGame(roomId);
                        }
                    }
                }

                const players = await this.getPlayers(roomId);
                return { players, addedBots };
            }
        }

        throw new BadRequestException('Player not in room');
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
            const p = JSON.parse(data);

            if (p.isBot) {
                await client.hdel(seatsKey, idx);
            } else {
                p.isReady = false; // Reset isReady
                delete p.ready;
                await client.hset(seatsKey, idx, JSON.stringify(p));
            }
        }
        // ...
        // Cleanup Game Engine
        this.gameManager.removeRoom(roomId);
        this.logger.log(`Room ${roomId} reset for rematch (Bots removed)`);
    }

    /**
     * Helper: Create Room
     */
    async createRoom(roomId: string, ownerId: string, config: any = {}): Promise<string> {
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
        return roomId;
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

