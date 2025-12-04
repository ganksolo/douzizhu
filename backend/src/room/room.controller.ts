import { Controller, Get, Post, Body, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoomService } from './room.service';

interface CreateRoomDto {
    name?: string;
    maxPlayers?: number;
    isPrivate?: boolean;
    password?: string;
}

interface RoomListQuery {
    status?: 'waiting' | 'playing' | 'finished';
    page?: number;
    limit?: number;
}

@Controller('rooms')
export class RoomController {
    constructor(private readonly roomService: RoomService) { }

    /**
     * GET /rooms - List available rooms
     * Query params: status, page, limit
     */
    @UseGuards(AuthGuard('jwt'))
    @Get()
    async listRooms(@Query() query: RoomListQuery, @Request() req) {
        const page = parseInt(String(query.page || '1'));
        const limit = Math.min(parseInt(String(query.limit || '20')), 100);
        const statusFilter = query.status;

        try {
            // Get all room IDs from Redis
            const allRoomIds = await this.roomService.getAllRoomIds();

            // Fetch room details
            const roomPromises = allRoomIds.map(async (roomId) => {
                try {
                    const meta = await this.roomService.getRoomMeta(roomId);
                    const players = await this.roomService.getPlayers(roomId);

                    if (!meta) return null;

                    // Filter by status if provided
                    if (statusFilter && meta.status !== statusFilter) {
                        return null;
                    }

                    return {
                        roomId,
                        name: `Room ${roomId}`, // Could be stored in config
                        hostId: meta.ownerId,
                        currentPlayers: players.length,
                        maxPlayers: 3, // Dou Dizhu is 3-player
                        isPrivate: false,
                        status: meta.status,
                        createdAt: new Date().toISOString(), // Could track in Redis
                    };
                } catch (err) {
                    console.error(`Failed to fetch room ${roomId}:`, err);
                    return null;
                }
            });

            const rooms = (await Promise.all(roomPromises)).filter((r) => r !== null);

            // Pagination
            const total = rooms.length;
            const totalPages = Math.ceil(total / limit);
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedRooms = rooms.slice(startIndex, endIndex);

            return {
                success: true,
                data: {
                    rooms: paginatedRooms,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages,
                    },
                },
            };
        } catch (error) {
            console.error('Error listing rooms:', error);
            throw new BadRequestException('Failed to list rooms');
        }
    }

    /**
     * POST /rooms - Create a new room
     * Body: name, maxPlayers, isPrivate, password
     */
    @UseGuards(AuthGuard('jwt'))
    @Post()
    async createRoom(@Body() body: CreateRoomDto, @Request() req) {
        const userId = req.user.sub;

        try {
            // Generate unique room ID
            const roomId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

            // Create room in Redis
            await this.roomService.createRoom(roomId, userId, {
                name: body.name || `Room ${roomId}`,
                maxPlayers: body.maxPlayers || 3,
                isPrivate: body.isPrivate || false,
            });

            return {
                success: true,
                data: {
                    roomId,
                    name: body.name || `Room ${roomId}`,
                    hostId: userId,
                    maxPlayers: body.maxPlayers || 3,
                    currentPlayers: 0, // Creator hasn't joined yet
                    isPrivate: body.isPrivate || false,
                    status: 'waiting',
                    createdAt: new Date().toISOString(),
                },
            };
        } catch (error) {
            console.error('Error creating room:', error);
            throw new BadRequestException('Failed to create room');
        }
    }
}
