import { Test, TestingModule } from '@nestjs/testing';
import { ReconnectService } from './reconnect.service';
import { RoomService } from '../room.service';

describe('ReconnectService (Phase 21.3)', () => {
    let service: ReconnectService;
    let mockRoomService: any;

    beforeEach(async () => {
        mockRoomService = {
            setPlayerOnline: jest.fn(),
            getRoomMeta: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReconnectService,
                {
                    provide: RoomService,
                    useValue: mockRoomService,
                },
            ],
        }).compile();

        service = module.get<ReconnectService>(ReconnectService);
    });

    describe('handleDisconnect', () => {
        it('should set player online to false', async () => {
            await service.handleDisconnect('1001', 'user-1');

            expect(mockRoomService.setPlayerOnline).toHaveBeenCalledWith('1001', 'user-1', false);
        });
    });

    describe('handleReconnect', () => {
        it('should set player online to true and return true if game is playing', async () => {
            mockRoomService.getRoomMeta.mockResolvedValue({ status: 'playing' });

            const result = await service.handleReconnect('1001', 'user-1');

            expect(mockRoomService.setPlayerOnline).toHaveBeenCalledWith('1001', 'user-1', true);
            expect(result).toBe(true);
        });

        it('should return false if game is waiting', async () => {
            mockRoomService.getRoomMeta.mockResolvedValue({ status: 'waiting' });

            const result = await service.handleReconnect('1001', 'user-1');

            expect(result).toBe(false);
        });

        it('should return false if room meta not found', async () => {
            mockRoomService.getRoomMeta.mockResolvedValue(null);

            const result = await service.handleReconnect('1001', 'user-1');

            expect(result).toBe(false);
        });
    });
});
