import { Test, TestingModule } from '@nestjs/testing';
import { AFKService } from './afk.service';
import { RoomService } from '../room.service';
import { RoomGateway } from '../room.gateway';

describe('AFKService (Phase 21.3)', () => {
    let service: AFKService;
    let mockRoomService: any;
    let mockRoomGateway: any;

    beforeEach(async () => {
        mockRoomService = {
            updateLastActive: jest.fn(),
            getAllRoomIds: jest.fn(),
            getPlayers: jest.fn(),
            kickPlayer: jest.fn(),
        };

        mockRoomGateway = {
            server: {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AFKService,
                {
                    provide: RoomService,
                    useValue: mockRoomService,
                },
                {
                    provide: RoomGateway,
                    useValue: mockRoomGateway,
                },
            ],
        }).compile();

        service = module.get<AFKService>(AFKService);
    });

    describe('updateActivity', () => {
        it('should call roomService.updateLastActive', async () => {
            await service.updateActivity('1001', 'user-1');
            expect(mockRoomService.updateLastActive).toHaveBeenCalledWith('1001', 'user-1');
        });
    });

    describe('checkAFK', () => {
        it('should emit player_afk if inactive > 30s', async () => {
            const now = Date.now();
            mockRoomService.getAllRoomIds.mockResolvedValue(['1001']);
            mockRoomService.getPlayers.mockResolvedValue([
                { userId: 'user-1', online: true, lastActive: now - 35000 }
            ]);

            await service.checkAFK();

            expect(mockRoomGateway.server.to).toHaveBeenCalledWith('1001');
            expect(mockRoomGateway.server.emit).toHaveBeenCalledWith('player_afk', { userId: 'user-1' });
        });

        it('should kick player if inactive > 90s', async () => {
            const now = Date.now();
            mockRoomService.getAllRoomIds.mockResolvedValue(['1001']);
            mockRoomService.getPlayers.mockResolvedValue([
                { userId: 'user-1', online: true, lastActive: now - 95000 }
            ]);
            mockRoomService.kickPlayer.mockResolvedValue(undefined);
            mockRoomService.getPlayers.mockResolvedValueOnce([
                { userId: 'user-1', online: true, lastActive: now - 95000 }
            ]).mockResolvedValueOnce([]); // After kick

            await service.checkAFK();

            expect(mockRoomService.kickPlayer).toHaveBeenCalledWith('1001', 'system', 'user-1');
            expect(mockRoomGateway.server.emit).toHaveBeenCalledWith('player_kicked', { targetId: 'user-1', reason: 'AFK' });
        });

        it('should skip offline players', async () => {
            const now = Date.now();
            mockRoomService.getAllRoomIds.mockResolvedValue(['1001']);
            mockRoomService.getPlayers.mockResolvedValue([
                { userId: 'user-1', online: false, lastActive: now - 95000 }
            ]);

            await service.checkAFK();

            expect(mockRoomService.kickPlayer).not.toHaveBeenCalled();
            expect(mockRoomGateway.server.emit).not.toHaveBeenCalled();
        });
    });
});
