import { Test, TestingModule } from '@nestjs/testing';
import { RoomCleanerService } from './room-cleaner.service';
import { RoomService } from '../room.service';

describe('RoomCleanerService (Phase 21.3)', () => {
    let service: RoomCleanerService;
    let mockRoomService: any;

    beforeEach(async () => {
        mockRoomService = {
            getAllRoomIds: jest.fn(),
            getPlayers: jest.fn(),
            destroyRoom: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoomCleanerService,
                {
                    provide: RoomService,
                    useValue: mockRoomService,
                },
            ],
        }).compile();

        service = module.get<RoomCleanerService>(RoomCleanerService);
    });

    describe('cleanAbandonedRooms', () => {
        it('should destroy empty rooms immediately', async () => {
            mockRoomService.getAllRoomIds.mockResolvedValue(['1001']);
            mockRoomService.getPlayers.mockResolvedValue([]);

            await service.cleanAbandonedRooms();

            expect(mockRoomService.destroyRoom).toHaveBeenCalledWith('1001');
        });

        it('should destroy rooms with all players offline > 10 mins', async () => {
            const tenMinutesAgo = Date.now() - 700000; // 11+ mins
            mockRoomService.getAllRoomIds.mockResolvedValue(['1001']);
            mockRoomService.getPlayers.mockResolvedValue([
                { userId: 'user-1', online: false, lastActive: tenMinutesAgo },
                { userId: 'user-2', online: false, lastActive: tenMinutesAgo }
            ]);

            await service.cleanAbandonedRooms();

            expect(mockRoomService.destroyRoom).toHaveBeenCalledWith('1001');
        });

        it('should NOT destroy rooms with at least one online player', async () => {
            const tenMinutesAgo = Date.now() - 700000;
            mockRoomService.getAllRoomIds.mockResolvedValue(['1001']);
            mockRoomService.getPlayers.mockResolvedValue([
                { userId: 'user-1', online: true, lastActive: tenMinutesAgo },
                { userId: 'user-2', online: false, lastActive: tenMinutesAgo }
            ]);

            await service.cleanAbandonedRooms();

            expect(mockRoomService.destroyRoom).not.toHaveBeenCalled();
        });

        it('should NOT destroy rooms with offline players but recent activity', async () => {
            const fiveMinutesAgo = Date.now() - 300000;
            mockRoomService.getAllRoomIds.mockResolvedValue(['1001']);
            mockRoomService.getPlayers.mockResolvedValue([
                { userId: 'user-1', online: false, lastActive: fiveMinutesAgo }
            ]);

            await service.cleanAbandonedRooms();

            expect(mockRoomService.destroyRoom).not.toHaveBeenCalled();
        });
    });
});
