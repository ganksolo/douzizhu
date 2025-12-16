import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InputNormalizer } from './input-normalizer';
import { GameAction, RoomData } from '../../types/game.types';
import { GameContext } from '../game-context';
import { GameRedisService } from '../../services/game-redis.service';
import { PlayActionHandler } from '../action-handlers/play-handler';
import { PassActionHandler } from '../action-handlers/pass-handler';
import { BidActionHandler } from '../action-handlers/bid-handler';

/**
 * Phase 18.3: Complete Action Pipeline with Redis Integration
 * Phase 35: Added BID action routing
 * 
 * Pipeline Flow:
 * 1. Input Normalization (Sanitization)
 * 2. Acquire Redis Lock (Prevent concurrent modifications)
 * 3. Load Current State from Redis
 * 4. Execute Handler (PLAY/PASS/BID)
 * 5. Atomic Write to Redis
 * 6. Release Lock
 * 7. Broadcast Event (via callback)
 * 
 * Error Handling:
 * - If Redis write fails, rollback is automatic (old state remains in Redis)
 * - Client receives error via WebSocket and can retry
 * - Distributed lock prevents race conditions
 */
@Injectable()
export class ActionPipelineService {
    private logger = new Logger(ActionPipelineService.name);
    private readonly LOCK_TTL = 5000; // 5 seconds lock TTL
    private readonly LOCK_RETRY_DELAY = 50; // 50ms between retries
    private readonly LOCK_MAX_RETRIES = 10;

    constructor(
        private inputNormalizer: InputNormalizer,
        private gameRedisService: GameRedisService,
        private playHandler: PlayActionHandler,
        private passHandler: PassActionHandler,
        private bidHandler: BidActionHandler,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    /**
     * Complete execution pipeline for player actions.
     * @param context GameContext for this room
     * @param rawInput Raw socket data
     * @param playerId Trusted player ID (from socket authentication)
     * @param broadcastCallback Callback to trigger state broadcast after successful execution
     * @returns Promise that resolves when action is fully processed
     */
    public async execute(
        context: GameContext,
        rawInput: any,
        playerId: string,
        broadcastCallback?: () => Promise<void>
    ): Promise<void> {
        const roomId = context.roomData.roomId;
        let lockAcquired = false;

        // Step 0: Ensure Context is Loaded (Fix for Server Restart)
        if (!context.currentState) {
            this.logger.log(`[Pipeline] Context state is empty for room ${roomId}, attempting to load from Redis`);
            await context.loadSnapshot(roomId);
            if (!context.currentState) {
                // If still empty, it means no snapshot exists (Game really not started?)
                this.logger.warn(`[Pipeline] Failed to restore state for room ${roomId}. Game might not be started.`);
                if (rawInput.type !== 'JOIN') { // Allow JOIN to proceed? Usually JOIN handled separately.
                    // But here we are in handleClientAction.
                }
            }
        }

        try {
            // Step 1: Input Normalization & Sanitization
            this.logger.debug(`[Pipeline] Step 1: Normalizing input for player ${playerId}`);
            const action = this.inputNormalizer.normalize(rawInput, playerId);
            this.logger.log(`[Pipeline] Action normalized: ${action.type} from ${action.playerId}`);

            // Step 2: Acquire Redis Distributed Lock
            this.logger.debug(`[Pipeline] Step 2: Acquiring lock for room ${roomId}`);
            lockAcquired = await this.acquireLock(roomId);
            if (!lockAcquired) {
                throw new Error(`Failed to acquire lock for room ${roomId} after ${this.LOCK_MAX_RETRIES} retries`);
            }
            this.logger.debug(`[Pipeline] Lock acquired for room ${roomId}`);

            // Step 3: Create snapshot before execution (for potential rollback info)
            const stateBefore = JSON.stringify(context.roomData);

            // Step 4: Execute Handler (PLAY or PASS)
            this.logger.debug(`[Pipeline] Step 4: Executing ${action.type} handler`);
            this.routeToHandler(context, action);
            this.logger.log(`[Pipeline] Handler execution completed for ${action.type}`);

            // Track action history for replay
            if (!context.roomData.actionHistory) {
                context.roomData.actionHistory = [];
            }
            context.roomData.actionHistory.push(action);

            // Step 5: Atomic Write to Redis
            this.logger.debug(`[Pipeline] Step 5: Writing updated state to Redis`);
            await context.saveSnapshot();
            this.logger.log(`[Pipeline] State persisted to Redis for room ${roomId}`);

            // Step 6: Broadcast State Update (if callback provided)
            if (broadcastCallback) {
                this.logger.debug(`[Pipeline] Step 6: Triggering broadcast callback`);
                await broadcastCallback();
            }

        } catch (error) {
            this.logger.error(`[Pipeline] Error in room ${roomId}: ${error.message}`);
            this.logger.error(`[Pipeline] Stack: ${error.stack}`);

            // Rollback Strategy:
            // - Redis write failed: Old state remains in Redis (automatic rollback)
            // - Handler failed: GameContext state is corrupted but not persisted
            // - Solution: Reload from Redis on next action
            this.logger.warn(`[Pipeline] Rollback: State was NOT persisted. Redis contains last valid state.`);

            // Re-throw to let Gateway send error to client
            throw error;

        } finally {
            // Step 7: Always release lock
            if (lockAcquired) {
                await this.releaseLock(roomId);
                this.logger.debug(`[Pipeline] Lock released for room ${roomId}`);
            }
        }
    }

    /**
     * Routes action to appropriate handler based on action type.
     */
    private routeToHandler(context: GameContext, action: GameAction): void {
        switch (action.type) {
            case 'PLAY':
                this.playHandler.handle(context, action);
                break;
            case 'PASS':
                this.passHandler.handle(context, action);
                break;
            case 'BID':
                this.bidHandler.handle(context, action);
                break;
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }

    /**
     * Acquires a distributed lock using Redis.
     * Uses SET NX EX pattern for atomic lock acquisition.
     */
    private async acquireLock(roomId: string): Promise<boolean> {
        const lockKey = `lock:room:${roomId}`;
        const lockValue = `${Date.now()}`; // Simple timestamp as lock value

        const store = (this.cacheManager as any).store;
        if (!store || !store.client) {
            // Fallback: If not using Redis, skip locking (for testing with memory cache)
            this.logger.warn('[Pipeline] Redis client not available, skipping lock (unsafe for production)');
            return true;
        }

        for (let i = 0; i < this.LOCK_MAX_RETRIES; i++) {
            try {
                // SET key value NX PX milliseconds
                // NX: Only set if not exists
                // PX: Set expiry in milliseconds
                const result = await store.client.set(lockKey, lockValue, 'PX', this.LOCK_TTL, 'NX');

                if (result === 'OK') {
                    return true;
                }

                // Lock is held by another process, wait and retry
                await this.sleep(this.LOCK_RETRY_DELAY);
            } catch (error) {
                this.logger.error(`[Pipeline] Error acquiring lock: ${error.message}`);
            }
        }

        return false;
    }

    /**
     * Releases the distributed lock.
     */
    private async releaseLock(roomId: string): Promise<void> {
        const lockKey = `lock:room:${roomId}`;

        const store = (this.cacheManager as any).store;
        if (!store || !store.client) {
            return; // No-op if Redis not available
        }

        try {
            await store.client.del(lockKey);
        } catch (error) {
            this.logger.error(`[Pipeline] Error releasing lock: ${error.message}`);
        }
    }

    /**
     * Utility: Sleep for specified milliseconds.
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
