import { Test, TestingModule } from '@nestjs/testing';
import { RoomService } from './room.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GameManagerService } from '../game/services/game-manager.service';
import { ConfigService } from '@nestjs/config';

describe('RoomService (Phase 21.1 Unit Tests)', () => {
    let service: RoomService;
    let mockRedisClient: any;

    beforeEach(async () => {
        mockRedisClient = {
            exists: jest.fn(),
            hget: jest.fn(),
            hset: jest.fn(),
            hlen: jest.fn(),
            hdel: jest.fn(),
            del: jest.fn(),
            expire: jest.fn(),
            hgetall: jest.fn(),
            keys: jest.fn(), // Added keys for getAllRoomIds
        };

        const mockCacheManager = {
            store: {
                client: mockRedisClient,
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoomService,
                {
                    provide: CACHE_MANAGER,
                    useValue: mockCacheManager,
                },
                {
                    provide: GameManagerService,
                    useValue: {
                        getOrCreateRoom: jest.fn().mockReturnValue({ roomData: { players: [] }, initialize: jest.fn() }),
                        removeRoom: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('localhost'),
                    },
                },
            ],
        }).compile();

        service = module.get<RoomService>(RoomService);
        // Manually inject redisClient as we are not running onModuleInit
        (service as any).redisClient = mockRedisClient;
    });

    describe('joinRoom', () => {
        it('should create room and add player if not exists', async () => {
            mockRedisClient.exists.mockResolvedValue(0); // Room not exists
            mockRedisClient.hget.mockResolvedValue(null); // Player not in room
            mockRedisClient.hlen.mockResolvedValue(0); // Room empty
            mockRedisClient.hgetall.mockResolvedValue({}); // No players yet

            // Mock getPlayers call inside joinRoom (after adding)
            // The service calls getPlayers twice: once to find seat, once to return result.
            // We need to handle the sequence.
            mockRedisClient.hgetall
                .mockResolvedValueOnce({}) // First call (find seat)
                .mockResolvedValueOnce({ // Second call (return result)
                    '1': JSON.stringify({ userId: '1', seat: 0, nickname: 'P1' })
                });

            const result = await service.joinRoom('1001', { id: '1', nickname: 'P1', avatar: 'a' });

            expect(mockRedisClient.hset).toHaveBeenCalledWith('room:1001:meta', 'ownerId', '1');
            expect(mockRedisClient.hset).toHaveBeenCalledWith('room:1001:seats', '0', expect.any(String));
            expect(result).toHaveLength(1);
            expect(result[0].userId).toBe('1');
        });

        it('should throw if room is full', async () => {
            mockRedisClient.exists.mockResolvedValue(1);
            // Mock hgetall to return 4 seats (Full)
            mockRedisClient.hgetall.mockResolvedValue({
                '0': '{}', '1': '{}', '2': '{}', '3': '{}'
            });

            await expect(service.joinRoom('1001', { id: '4', nickname: 'P4', avatar: 'a' }))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('leaveRoom', () => {
        it('should destroy room if last player leaves', async () => {
            mockRedisClient.hgetall.mockResolvedValueOnce({
                '0': JSON.stringify({ userId: '1', seat: 0 })
            });
            mockRedisClient.hlen.mockResolvedValue(0);

            await service.leaveRoom('1001', '1');

            expect(mockRedisClient.del).toHaveBeenCalledWith('room:1001:meta');
            expect(mockRedisClient.del).toHaveBeenCalledWith('room:1001:seats');
        });

        it('should transfer owner if owner leaves', async () => {
            mockRedisClient.hdel.mockResolvedValue(1);
            // Remaining player
            mockRedisClient.hgetall.mockResolvedValue({
                '2': JSON.stringify({ userId: '2', seat: 1, nickname: 'P2' })
            });
            mockRedisClient.hget.mockResolvedValue('1'); // Current owner is 1

            await service.leaveRoom('1001', '1');

            expect(mockRedisClient.hset).toHaveBeenCalledWith('room:1001:meta', 'ownerId', '2');
        });
    });

    describe('kickPlayer', () => {
        it('should kick player if owner', async () => {
            mockRedisClient.hget.mockResolvedValue('1'); // Owner is 1
            // Mock leaveRoom logic implicitly or spy on it
            // Since leaveRoom is public, we can spy on it? 
            // Or just let it run. We need to mock leaveRoom dependencies.

            // Mocking leaveRoom dependencies for the call inside kickPlayer
            mockRedisClient.hdel.mockResolvedValue(1);
            // First hgetall for leaveRoom (finding target '2')
            mockRedisClient.hgetall.mockResolvedValueOnce({
                '1': JSON.stringify({ userId: '1' }), // Owner
                '2': JSON.stringify({ userId: '2', seat: 1 }) // Target
            });
            // Second hgetall/hlen for leaveRoom check? 
            // leaveRoom calls hlen.
            mockRedisClient.hlen.mockResolvedValue(2); // Still have players

            await service.kickPlayer('1001', '1', '2');

            expect(mockRedisClient.hdel).toHaveBeenCalledWith('room:1001:seats', '2');
        });

        it('should throw if not owner', async () => {
            mockRedisClient.hget.mockResolvedValue('1'); // Owner is 1

            await expect(service.kickPlayer('1001', '2', '3'))
                .rejects.toThrow(ForbiddenException);
        });
    });

    describe('toggleReady', () => {
        it('should update ready status', async () => {
            mockRedisClient.hget.mockResolvedValue(JSON.stringify({ userId: '1', ready: false }));
            mockRedisClient.hgetall.mockResolvedValue({
                '1': JSON.stringify({ userId: '1', ready: true })
            });

            const result = await service.toggleReady('1001', '1', true);

            expect(mockRedisClient.hset).toHaveBeenCalledWith('room:1001:seats', '1', expect.stringContaining('"ready":true'));
            expect(result[0].ready).toBe(true);
        });

        it('should throw if player not found', async () => {
            // Mock hgetall to return empty for not found
            mockRedisClient.hgetall.mockResolvedValue({});

            await expect(service.toggleReady('1001', '1', true)).rejects.toThrow(BadRequestException);
        });
    });

    describe('tryStartGame', () => {
        it('should start game if 3 players all ready', async () => {
            mockRedisClient.hgetall.mockResolvedValue({
                '1': JSON.stringify({ userId: '1', ready: true }),
                '2': JSON.stringify({ userId: '2', ready: true }),
                '3': JSON.stringify({ userId: '3', ready: true })
            });

            // Mock GameManager
            const mockGameContext = {
                roomData: { players: [] },
                initialize: jest.fn()
            };
            (service as any).gameManager = {
                getOrCreateRoom: jest.fn().mockReturnValue(mockGameContext)
            };

            const result = await service.tryStartGame('1001');

            expect(result).toBe(true);
            expect(mockRedisClient.hset).toHaveBeenCalledWith('room:1001:meta', 'status', 'playing');
            expect(mockGameContext.initialize).toHaveBeenCalled();
        });

        it('should not start if not enough players', async () => {
            mockRedisClient.hgetall.mockResolvedValue({});
            const result = await service.tryStartGame('1001');
            expect(result).toBe(false);
        });

        it('should not start if someone not ready', async () => {
            mockRedisClient.hgetall.mockResolvedValue({
                '1': JSON.stringify({ userId: '1', ready: true }),
                '2': JSON.stringify({ userId: '2', ready: true }),
                '3': JSON.stringify({ userId: '3', ready: false })
            });
            const result = await service.tryStartGame('1001');
            expect(result).toBe(false);
        });
    });

    describe('requestRematch', () => {
        it('should reset room and players', async () => {
            mockRedisClient.hgetall.mockResolvedValue({
                '1': JSON.stringify({ userId: '1', ready: true }),
                '2': JSON.stringify({ userId: '2', ready: true })
            });

            (service as any).gameManager = {
                removeRoom: jest.fn()
            };

            await service.requestRematch('1001');

            expect(mockRedisClient.hset).toHaveBeenCalledWith('room:1001:meta', 'status', 'waiting');
            expect(mockRedisClient.hset).toHaveBeenCalledWith('room:1001:seats', '1', expect.stringContaining('"ready":false'));
            expect(mockRedisClient.hset).toHaveBeenCalledWith('room:1001:seats', '2', expect.stringContaining('"ready":false'));
            expect((service as any).gameManager.removeRoom).toHaveBeenCalledWith('1001');
        });
    });
});
