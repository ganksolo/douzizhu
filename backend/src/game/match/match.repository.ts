import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { MatchRecord } from './match.entity';

/**
 * Phase 19.1: Match Record Repository
 * 
 * Encapsulates database operations for match records.
 * Provides methods for creating, querying, and retrieving match history.
 */
@Injectable()
export class MatchRepository {
    constructor(
        @InjectRepository(MatchRecord)
        private readonly repository: Repository<MatchRecord>,
    ) { }

    /**
     * Create and save a new match record
     * @param data Partial match record data
     * @returns Saved match record with generated ID
     */
    async createAndSave(data: DeepPartial<MatchRecord>): Promise<MatchRecord> {
        const record = this.repository.create(data);

        // Compute duration before saving
        if (record.startTime && record.endTime) {
            record.computeDuration();
        }

        return await this.repository.save(record);
    }

    /**
     * Find match records where a specific player participated
     * @param playerId Player user ID
     * @param limit Maximum number of records to return
     * @returns Array of match records, ordered by most recent first
     */
    async findByPlayerId(playerId: string, limit: number = 20): Promise<MatchRecord[]> {
        // Query matches where playerId appears in playersJson
        // Note: JSON querying syntax may vary by MySQL version
        // For MySQL 5.7+: Use JSON_CONTAINS or JSON_SEARCH

        const query = this.repository.createQueryBuilder('match');

        // Search for playerId in playersJson array
        // Using raw SQL for JSON search (MySQL 5.7+)
        query.where(
            `JSON_SEARCH(match.playersJson, 'one', :playerId, NULL, '$[*].userId') IS NOT NULL`,
            { playerId }
        );

        query.orderBy('match.startTime', 'DESC');
        query.limit(limit);

        return await query.getMany();
    }

    /**
     * Find match records by room ID
     * @param roomId Room ID
     * @param limit Maximum number of records
     * @returns Array of match records
     */
    async findByRoomId(roomId: string, limit: number = 20): Promise<MatchRecord[]> {
        return await this.repository.find({
            where: { roomId },
            order: { startTime: 'DESC' },
            take: limit,
        });
    }

    /**
     * Find match records by winner
     * @param winnerPlayerId Winner player ID
     * @param limit Maximum number of records
     * @returns Array of match records
     */
    async findByWinner(winnerPlayerId: string, limit: number = 20): Promise<MatchRecord[]> {
        return await this.repository.find({
            where: { winnerPlayerId },
            order: { startTime: 'DESC' },
            take: limit,
        });
    }

    /**
     * Get match record by ID
     * @param id Match record ID
     * @returns Match record or null
     */
    async findById(id: string): Promise<MatchRecord | null> {
        return await this.repository.findOne({ where: { id } });
    }

    /**
     * Get total number of matches
     * @returns Total count
     */
    async count(): Promise<number> {
        return await this.repository.count();
    }

    /**
     * Get matches within a time range
     * @param startDate Start date
     * @param endDate End date
     * @returns Array of match records
     */
    async findByDateRange(startDate: Date, endDate: Date): Promise<MatchRecord[]> {
        return await this.repository
            .createQueryBuilder('match')
            .where('match.startTime >= :startDate', { startDate })
            .andWhere('match.startTime <= :endDate', { endDate })
            .orderBy('match.startTime', 'DESC')
            .getMany();
    }
    /**
     * Get aggregated stats for a player
     * @param playerId Player ID
     * @returns Object with total matches and wins
     */
    async getPlayerStats(playerId: string): Promise<{ totalMatches: number; totalWins: number }> {
        const totalMatches = await this.repository
            .createQueryBuilder('match')
            .where(`JSON_SEARCH(match.playersJson, 'one', :playerId, NULL, '$[*].userId') IS NOT NULL`, { playerId })
            .getCount();

        const totalWins = await this.repository.count({
            where: { winnerPlayerId: playerId },
        });

        return { totalMatches, totalWins };
    }
}
