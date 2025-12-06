import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, NotFoundException, BadRequestException, Delete } from '@nestjs/common';
import { RoomService } from './room.service';
import { AuthGuard } from '@nestjs/passport';
import { v4 as uuidv4 } from 'uuid';

@Controller('rooms')
export class RoomController {
    constructor(private readonly roomService: RoomService) { }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async getRooms(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
        const result = await this.roomService.getRooms(page, limit);
        const totalPages = Math.ceil(result.total / limit);
        return {
            success: true,
            data: {
                rooms: result.rooms,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: result.total,
                    totalPages
                }
            }
        };
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'))
    async getRoom(@Param('id') id: string) {
        const meta = await this.roomService.getRoomMeta(id);
        if (!meta) throw new NotFoundException('Room not found');
        const players = await this.roomService.getPlayers(id);

        const configObj = meta.config ? JSON.parse(meta.config) : {};

        return {
            success: true,
            data: {
                roomId: id,
                name: configObj.name || `Room ${id.substr(0, 6)}`,
                hostId: meta.ownerId,
                currentPlayers: players.length,
                maxPlayers: configObj.maxPlayers || 4,
                status: meta.status,
                type: configObj.type || 'PVP',
                difficulty: configObj.difficulty || 'MEDIUM',
                isPrivate: configObj.isPrivate || false,
                botCount: configObj.botCount || 0,
                players,
                config: configObj
            }
        };
    }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async createRoom(@Body() body: any, @Request() req) {
        // body: { name, type, difficulty, botCount, isPrivate, password }
        const roomId = uuidv4();
        const userId = req.user.userId;

        // Default config
        const config = {
            name: body.name || `${req.user.username}'s Room`,
            type: body.type || 'PVP',
            difficulty: body.difficulty || 'MEDIUM',
            botCount: body.botCount || 0,
            isPrivate: body.isPrivate || false,
            password: body.password || '',
            maxPlayers: body.maxPlayers || 4
        };

        const createdRoomId = await this.roomService.createRoom(roomId, userId, config);

        // Auto-join the creator to the room
        await this.roomService.joinRoom(createdRoomId, {
            id: userId,
            nickname: req.user.username,
            avatar: req.user.avatar || 'default_avatar'
        });

        return {
            success: true,
            data: {
                roomId: createdRoomId,
                ...config,
                hostId: userId,
                status: 'waiting',
                currentPlayers: 1
            }
        };
    }

    @Post(':id/join')
    @UseGuards(AuthGuard('jwt'))
    async joinRoom(@Param('id') roomId: string, @Body() body: any, @Request() req) {
        const password = body.password;
        const meta = await this.roomService.getRoomMeta(roomId);
        if (!meta) throw new NotFoundException('Room not found');

        const config = meta.config ? JSON.parse(meta.config) : {};
        if (config.isPrivate && config.password !== password) {
            throw new BadRequestException('Invalid password');
        }

        const players = await this.roomService.joinRoom(roomId, {
            id: req.user.userId,
            nickname: req.user.username,
            avatar: req.user.avatar || 'default_avatar'
        });

        return {
            success: true,
            data: {
                roomId,
                playerId: req.user.userId,
                players
            }
        };
    }

    @Post(':id/leave')
    @UseGuards(AuthGuard('jwt'))
    async leaveRoom(@Param('id') roomId: string, @Request() req) {
        await this.roomService.leaveRoom(roomId, req.user.userId);
        return { success: true, message: 'Left room successfully' };
    }
}
