import { Test, TestingModule } from '@nestjs/testing';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { NotFoundException } from '@nestjs/common';

describe('RoomController', () => {
    let controller: RoomController;
    let service: RoomService;

    const mockRoomService = {
        getRooms: jest.fn(),
        getRoomMeta: jest.fn(),
        getPlayers: jest.fn(),
        createRoom: jest.fn(),
        joinRoom: jest.fn(),
        leaveRoom: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [RoomController],
            providers: [
                {
                    provide: RoomService,
                    useValue: mockRoomService,
                },
            ],
        }).compile();

        controller = module.get<RoomController>(RoomController);
        service = module.get<RoomService>(RoomService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getRooms', () => {
        it('should return paginated rooms', async () => {
            const result = { rooms: [], total: 0 };
            mockRoomService.getRooms.mockResolvedValue(result);
            expect(await controller.getRooms(1, 20)).toBe(result);
        });
    });

    describe('createRoom', () => {
        it('should create a room and join the host', async () => {
            const body = { name: 'Test Room' };
            const req = { user: { userId: '1', username: 'Host' } };
            mockRoomService.createRoom.mockResolvedValue('room-1');
            mockRoomService.joinRoom.mockResolvedValue([]);

            const result = await controller.createRoom(body, req);

            expect(mockRoomService.createRoom).toHaveBeenCalled();
            expect(mockRoomService.joinRoom).toHaveBeenCalledWith('room-1', expect.objectContaining({ id: '1' }));
            expect(result.data.roomId).toBe('room-1');
        });
    });

    describe('getRoom', () => {
        it('should return room details if found', async () => {
            mockRoomService.getRoomMeta.mockResolvedValue({ config: '{}' });
            mockRoomService.getPlayers.mockResolvedValue([]);
            const result = await controller.getRoom('1');
            expect(result.roomId).toBe('1');
        });

        it('should throw NotFoundException if not found', async () => {
            mockRoomService.getRoomMeta.mockResolvedValue(null);
            await expect(controller.getRoom('1')).rejects.toThrow(NotFoundException);
        });
    });
});
