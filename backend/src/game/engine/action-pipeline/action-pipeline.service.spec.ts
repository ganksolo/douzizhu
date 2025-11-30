import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ActionPipelineService } from './action-pipeline.service';
import { InputNormalizer } from './input-normalizer';
import { GameRedisService } from '../../services/game-redis.service';
import { PlayActionHandler } from '../action-handlers/play-handler';
import { PassActionHandler } from '../action-handlers/pass-handler';
import { ActionType } from '../../types/game.types';

describe('ActionPipelineService (Phase 18.3 Integration)', () => {
    let service: ActionPipelineService;
    let inputNormalizer: InputNormalizer;
    let gameRedisService: GameRedisService;
    let playHandler: PlayActionHandler;
    let passHandler: PassActionHandler;
    let mockRedisClient: any;
    let mockContext: any;

    beforeEach(async () => {
        mockRedisClient = {
            set: jest.fn().mockResolvedValue('OK'),
            del: jest.fn().mockResolvedValue(1),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActionPipelineService,
                {
                    provide: InputNormalizer,
                    useValue: {
                        normalize: jest.fn((raw, playerId) => ({
                            type: raw.type,
                            playerId,
                            payload: raw.payload,
                            timestamp: Date.now()
                        }))
                    }
                },
                {
                    provide: GameRedisService,
                    useValue: {
                        saveSnapshot: jest.fn().mockResolvedValue(undefined)
                    }
                },
                {
                    provide: PlayActionHandler,
                    useValue: {
                        handle: jest.fn()
                    }
                },
                {
                    provide: PassActionHandler,
                    useValue: {
                        handle: jest.fn()
                    }
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: {
                        store: {
                            client: mockRedisClient
                        }
                    }
                }
            ],
        }).compile();

        service = module.get<ActionPipelineService>(ActionPipelineService);
        inputNormalizer = module.get<InputNormalizer>(InputNormalizer);
        gameRedisService = module.get<GameRedisService>(GameRedisService);
        playHandler = module.get<PlayActionHandler>(PlayActionHandler);
        passHandler = module.get<PassActionHandler>(PassActionHandler);

        mockContext = {
            roomData: {
                roomId: 'test-room-123',
                players: [{ id: 'player1', hand: ['♠3'], handCount: 1 }],
                currentTurn: 'player1',
                lastPlayedCards: null
            },
            saveSnapshot: jest.fn().mockResolvedValue(undefined)
        };
    });

    describe('PIPE-001: Complete E2E Action Flow', () => {
        it('should execute complete pipeline: Normalize → Lock → Execute → Save → Broadcast', async () => {
            const rawInput = { type: ActionType.PLAY, payload: ['♠3'] };
            const broadcastCb = jest.fn().mockResolvedValue(undefined);

            await service.execute(mockContext, rawInput, 'player1', broadcastCb);

            // Verify all steps executed
            expect(inputNormalizer.normalize).toHaveBeenCalledWith(rawInput, 'player1');
            expect(mockRedisClient.set).toHaveBeenCalledWith(
                'lock:room:test-room-123',
                expect.any(String),
                'PX',
                5000,
                'NX'
            );
            expect(playHandler.handle).toHaveBeenCalled();
            expect(mockContext.saveSnapshot).toHaveBeenCalled();
            expect(broadcastCb).toHaveBeenCalled();
            expect(mockRedisClient.del).toHaveBeenCalledWith('lock:room:test-room-123');
        });
    });

    describe('PIPE-002: Redis Distributed Lock (Concurrency Control)', () => {
        it('should retry lock acquisition up to 10 times', async () => {
            // First 3 calls fail (lock held), 4th succeeds
            mockRedisClient.set
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce('OK');

            const rawInput = { type: ActionType.PLAY, payload: ['♠3'] };
            await service.execute(mockContext, rawInput, 'player1');

            expect(mockRedisClient.set).toHaveBeenCalledTimes(4);
        });

        it('should fail after 10 unsuccessful retries', async () => {
            mockRedisClient.set.mockResolvedValue(null); // Always locked

            const rawInput = { type: ActionType.PLAY, payload: ['♠3'] };

            await expect(service.execute(mockContext, rawInput, 'player1'))
                .rejects.toThrow('Failed to acquire lock');

            expect(mockRedisClient.set).toHaveBeenCalledTimes(10);
        });
    });

    describe('PIPE-003: Atomic Write to Redis', () => {
        it('should persist state after successful handler execution', async () => {
            const rawInput = { type: ActionType.PLAY, payload: ['♠3'] };
            await service.execute(mockContext, rawInput, 'player1');

            expect(mockContext.saveSnapshot).toHaveBeenCalled();
        });
    });

    describe('PIPE-004: Handler Validation Failure Rollback', () => {
        it('should NOT persist state when handler throws error', async () => {
            const errorMsg = 'Invalid move: Cannot beat last play';
            playHandler.handle = jest.fn().mockImplementation(() => {
                throw new Error(errorMsg);
            });

            const rawInput = { type: ActionType.PLAY, payload: ['♠3'] };

            await expect(service.execute(mockContext, rawInput, 'player1'))
                .rejects.toThrow(errorMsg);

            // saveSnapshot should NOT be called
            expect(mockContext.saveSnapshot).not.toHaveBeenCalled();

            // Lock should still be released
            expect(mockRedisClient.del).toHaveBeenCalledWith('lock:room:test-room-123');
        });
    });

    describe('PIPE-005: Redis Write Failure Rollback', () => {
        it('should release lock even when Redis write fails', async () => {
            mockContext.saveSnapshot = jest.fn().mockRejectedValue(new Error('Redis connection timeout'));

            const rawInput = { type: ActionType.PLAY, payload: ['♠3'] };

            await expect(service.execute(mockContext, rawInput, 'player1'))
                .rejects.toThrow('Redis connection timeout');

            // Handler should have been called
            expect(playHandler.handle).toHaveBeenCalled();

            // Lock should still be released in finally block
            expect(mockRedisClient.del).toHaveBeenCalledWith('lock:room:test-room-123');
        });
    });

    describe('PIPE-006: Lock Acquisition Failure', () => {
        it('should throw LOCK_TIMEOUT error after max retries', async () => {
            mockRedisClient.set.mockResolvedValue(null);

            const rawInput = { type: ActionType.PLAY, payload: ['♠3'] };

            await expect(service.execute(mockContext, rawInput, 'player1'))
                .rejects.toThrow('Failed to acquire lock for room test-room-123 after 10 retries');
        });
    });

    describe('PIPE-007: Error Propagation to Gateway', () => {
        it('should propagate handler errors for Gateway to catch', async () => {
            const customError = new Error('NOT_YOUR_TURN');
            playHandler.handle = jest.fn().mockImplementation(() => {
                throw customError;
            });

            const rawInput = { type: ActionType.PLAY, payload: ['♠3'] };

            await expect(service.execute(mockContext, rawInput, 'player1'))
                .rejects.toThrow('NOT_YOUR_TURN');
        });

        it('should propagate normalization errors', async () => {
            inputNormalizer.normalize = jest.fn().mockImplementation(() => {
                throw new Error('Invalid payload: Payload too large');
            });

            const rawInput = { type: ActionType.PLAY, payload: new Array(100).fill('♠3') };

            await expect(service.execute(mockContext, rawInput, 'player1'))
                .rejects.toThrow('Invalid payload');
        });
    });
});
