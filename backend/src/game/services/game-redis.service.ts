import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RoomData } from '../types/game.types';

@Injectable()
export class GameRedisService {
    private logger = new Logger(GameRedisService.name);

    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    private getRoomKey(roomId: string): string {
        return `room:${roomId}:state`;
    }

    /**
     * Save game snapshot to Redis
     */
    async saveSnapshot(roomId: string, stateName: string, data: RoomData): Promise<void> {
        const key = this.getRoomKey(roomId);
        const snapshot = {
            current_state_name: stateName,
            room_data: JSON.stringify(data),
            updated_at: Date.now(),
        };

        try {
            // Use mset (or equivalent in cache-manager if supported, otherwise individual sets or store object)
            // cache-manager's set usually stores a single value. For Hash, we need direct redis client or store object.
            // Assuming cache-manager-ioredis-yet, the store is a Redis client.
            const store = (this.cacheManager as any).store;
            if (store && store.client) {
                await store.client.hset(key, snapshot);
                // Set expiry to 24h to prevent stale data accumulation
                await store.client.expire(key, 86400);
            } else {
                // Fallback for memory cache (testing)
                await this.cacheManager.set(key, snapshot, 86400000);
            }

            this.logger.debug(`Saved snapshot for room ${roomId} in state ${stateName}`);
        } catch (error) {
            this.logger.error(`Failed to save snapshot for room ${roomId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load game snapshot from Redis
     */
    async loadSnapshot(roomId: string): Promise<{ stateName: string; data: RoomData } | null> {
        const key = this.getRoomKey(roomId);

        try {
            const store = (this.cacheManager as any).store;
            let snapshot: any;

            if (store && store.client) {
                snapshot = await store.client.hgetall(key);
                // hgetall returns empty object if key doesn't exist
                if (!snapshot || Object.keys(snapshot).length === 0) return null;
            } else {
                snapshot = await this.cacheManager.get(key);
                if (!snapshot) return null;
            }

            return {
                stateName: snapshot.current_state_name,
                data: JSON.parse(snapshot.room_data),
            };
        } catch (error) {
            this.logger.error(`Failed to load snapshot for room ${roomId}: ${error.message}`);
            throw error;
        }
    }
}
