import { Controller, Get, Param, ParseIntPipe, Query, NotFoundException } from '@nestjs/common';
import { MatchRepository } from './match.repository';
import { MatchRecord } from './match.entity';

/**
 * Phase 19.3: Match Controller
 * 
 * Exposes match history and details to the frontend.
 */
@Controller('matches')
export class MatchController {
    constructor(
        private readonly matchRepository: MatchRepository,
    ) { }

    /**
     * Get match history for a specific player
     * GET /matches/player/:playerId?limit=20
     */
    @Get('player/:playerId')
    async getPlayerHistory(
        @Param('playerId') playerId: string,
        @Query('limit') limit: number = 20,
    ): Promise<MatchRecord[]> {
        // Cap limit to avoid heavy queries
        const safeLimit = Math.min(Math.max(1, limit), 50);
        return await this.matchRepository.findByPlayerId(playerId, safeLimit);
    }

    /**
     * Get detailed match record by ID
     * GET /matches/:id
     */
    @Get(':id')
    async getMatchDetail(@Param('id') id: string): Promise<MatchRecord> {
        const match = await this.matchRepository.findById(id);
        if (!match) {
            throw new NotFoundException(`Match with ID ${id} not found`);
        }
        return match;
    }
}
