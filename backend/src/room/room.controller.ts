import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, NotFoundException, BadRequestException, Delete } from '@nestjs/common';
import { RoomService } from './room.service';
import { AuthGuard } from '@nestjs/passport';
import { v4 as uuidv4 } from 'uuid';

import { GameGateway } from '../game/gateway/game.gateway';

@Controller('rooms')
export class RoomController {
    constructor(
        private readonly roomService: RoomService,
        private readonly gameGateway: GameGateway
    ) { }

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

        return {
            success: true,
            data: {
                roomId: createdRoomId,
                ...config,
                hostId: userId,
                status: 'waiting',
                currentPlayers: 0  // No players seated yet
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
            avatar: req.user.avatar || '' // FIX: Empty string for frontend fallback
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

    @Post(':id/ai')
    @UseGuards(AuthGuard('jwt'))
    async addAi(@Param('id') roomId: string) {
        const bot = await this.roomService.addBotToRoom(roomId);

        // Emit events via Socket
        // 1. Notify room of new player (Bot)
        // Emit list update (full state)
        this.gameGateway.server.to(roomId).emit('player_list_update', {
            roomId,
            players: await this.roomService.getPlayers(roomId)
        });

        // Emit specific join event (for notifications)
        this.gameGateway.server.to(roomId).emit('player_joined', {
            userId: bot.userId,
            username: bot.nickname,
            isBot: true
        });

        // 2. Try Start Game
        const started = await this.roomService.tryStartGame(roomId);
        if (started) {
            this.gameGateway.server.to(roomId).emit('game_start', { roomId });
            // Ideally trigger initial state broadcast too, but GameGateway handles that on 'join' or 'ready' usually.
            // Since this is a REST call, we might not have easy access to broadcastState *private* method unless we expose it or use a public wrapper.
            // However, GameGateway runs a loop or we can just let clients fetch state.
            // But GameGateway.handleToggleReady calls tryStartGame and emits game_start.
            // Let's assume frontend will react to game_start by listening to sync_state or requesting it.
            // But wait, GameGateway.broadcastState is private.
            // We should make it public or expose a method?
            // Or just rely on the next game loop tick?
            // The game loop calls context.update() which handles logic, but broadcasting?
            // GameGateway.broadcastState is manual.
            // Let's rely on the frontend to maybe request state or the game loop to eventually sync?
            // Actually, `game_start` event is the trigger.
            // If we want immediate visual update, we should broadcast.
            // Let's assume for this phase, emitting `game_start` is sufficient for FE to switch scene.
        }

        return {
            success: true,
            data: bot
        };
    }

    @Post(':id/fill-bots')
    @UseGuards(AuthGuard('jwt'))
    async fillBots(@Param('id') roomId: string) {
        const bots = await this.roomService.fillBotsToRoom(roomId);

        if (bots.length === 0) {
            return {
                success: true,
                message: 'Room is already full',
                data: { botsAdded: 0, bots: [] }
            };
        }

        // Emit events for each bot via Socket
        const allPlayers = await this.roomService.getPlayers(roomId);

        // Broadcast full player list update
        this.gameGateway.server.to(roomId).emit('player_list_update', {
            roomId,
            players: allPlayers
        });

        // Emit individual player_joined events for each bot
        for (const bot of bots) {
            this.gameGateway.server.to(roomId).emit('player_joined', {
                userId: bot.userId,
                username: bot.nickname,
                isBot: true,
                seat: bot.seat
            });
        }

        // Try Start Game
        const started = await this.roomService.tryStartGame(roomId);
        if (started) {
            this.gameGateway.server.to(roomId).emit('game_start', { roomId });
        }

        return {
            success: true,
            data: {
                botsAdded: bots.length,
                bots: bots
            }
        };
    }
}
