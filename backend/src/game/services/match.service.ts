import { Injectable, Logger } from '@nestjs/common';
import { MatchRepository } from '../match/match.repository';
import type { PlayerSnapshot, ActionRecord, MatchResultData, CreateMatchRecordDto } from '../match/match.types';
import type { RoomData, Player } from '../types/game.types';

/**
 * Phase 19.2: Match Service
 * 
 * Handles conversion from hot Redis data (RoomData) to cold MySQL storage (MatchRecord).
 * Orchestrates match result persistence at game end.
 */
@Injectable()
export class MatchService {
    private logger = new Logger(MatchService.name);

    constructor(
        private matchRepository: MatchRepository,
    ) { }

    /**
     * Save match result to MySQL database
     * Converts RoomData (Redis hot data) to MatchRecord (MySQL cold storage)
     * 
     * @param roomData Complete room state from GameContext
     * @param winnerId Player ID who won the match
     * @param startTime Match start timestamp
     * @returns Promise<void>
     */
    /**
     * Save match result to MySQL database
     */
    async saveMatchResult(
        roomData: RoomData,
        winnerId: string,
        startTime: Date,
    ): Promise<void> {
        try {
            const endTime = new Date();
            const matchDto = this.transformToMatchRecord(roomData, winnerId, startTime, endTime);
            const savedRecord = await this.matchRepository.createAndSave(matchDto);
            this.logger.log(`Match saved: roomId=${roomData.roomId}, matchId=${savedRecord.id}, winner=${winnerId}`);
        } catch (error) {
            this.logger.error(`Failed to save match result for room ${roomData.roomId}: ${error.message}`);
            this.logger.error(error.stack);
        }
    }

    /**
     * Core Transformation Logic: RoomData (Redis) -> MatchRecord DTO (MySQL)
     * This corresponds to the 'toGameResult' requirement.
     */
    public transformToMatchRecord(
        roomData: RoomData,
        winnerId: string,
        startTime: Date,
        endTime: Date
    ): CreateMatchRecordDto {
        // 1. Convert players
        const playersJson: PlayerSnapshot[] = roomData.players.map(player => ({
            userId: player.id,
            username: player.name,
            role: player.role || 'peasant',
            finalHand: player.hand || [],
            score: this.calculatePlayerScore(player, winnerId, roomData),
            handCount: player.hand?.length || 0,
        }));

        // 2. Extract actions
        const actions: ActionRecord[] = this.extractActionHistory(roomData);

        // 3. Determine win method
        const winMethod = this.determineWinMethod(roomData, winnerId);

        // 4. Build Result JSON
        const resultJson: MatchResultData = {
            players: playersJson,
            actions,
            landlordPlayerId: roomData.landlordId || winnerId,
            winnerPlayerId: winnerId,
            winMethod,
            multiplier: roomData.multiplier || 1,
            duration: Math.floor((endTime.getTime() - startTime.getTime()) / 1000),
        };

        return {
            roomId: roomData.roomId,
            playersJson,
            resultJson,
            winnerPlayerId: winnerId,
            landlordPlayerId: roomData.landlordId || winnerId,
            startTime,
            endTime,
        };
    }

    /**
     * Calculate score for a player based on game outcome
     */
    private calculatePlayerScore(player: Player, winnerId: string, roomData: RoomData): number {
        const basePoints = 100; // Base stake
        const isLandlord = player.id === roomData.landlordId;
        const landlordWon = winnerId === roomData.landlordId;
        const multiplier = roomData.multiplier || 1;
        const unitScore = basePoints * multiplier;

        // 4-Player Scoring (1 Landlord vs 3 Peasants)
        // Landlord Win: +3x, Peasants: -1x
        // Landlord Loss: -3x, Peasants: +1x

        if (isLandlord) {
            return landlordWon ? (3 * unitScore) : (-3 * unitScore);
        } else {
            return landlordWon ? (-1 * unitScore) : (1 * unitScore);
        }
    }

    /**
     * Extract action history from RoomData
     */
    private extractActionHistory(roomData: RoomData): ActionRecord[] {
        if (roomData.actionHistory && roomData.actionHistory.length > 0) {
            return roomData.actionHistory
                .filter(action => ['PLAY', 'PASS', 'BID', 'CALL', 'ROB'].includes(action.type)) // Filter relevant actions
                .map(action => ({
                    timestamp: action.timestamp,
                    playerId: action.playerId,
                    actionType: action.type as any, // Allow all filtered types
                    cards: action.payload?.cards || (Array.isArray(action.payload) ? action.payload : undefined),
                }));
        }

        // Fallback
        const actions: ActionRecord[] = [];
        if (roomData.lastPlayedCards) {
            actions.push({
                timestamp: Date.now(),
                playerId: roomData.lastPlayedCards.playerId,
                actionType: 'PLAY',
                cards: roomData.lastPlayedCards.cards,
            });
        }
        return actions;
    }

    /**
     * Determine win method based on opponent hand counts
     */
    private determineWinMethod(roomData: RoomData, winnerId: string): 'normal' | 'spring' | 'anti-spring' {
        const winner = roomData.players.find(p => p.id === winnerId);
        const isLandlord = winnerId === roomData.landlordId;

        if (!winner) return 'normal';

        const opponents = roomData.players.filter(p => p.id !== winnerId);

        // Spring: Landlord wins, peasants played NO cards
        if (isLandlord) {
            const peasantsPlayedCards = opponents.some(p => {
                // Initial hand for peasant is 25 (in 2-deck mode? usually 17 in standard, 25 in 4-player?)
                // Let's assume strict check: if hand count < initial, they played.
                // But we don't know initial count easily here without config.
                // Heuristic: In 4-player 2-deck, peasants start with 25 cards.
                // If any peasant has < 25 cards, they played.
                return (p.hand?.length || 0) < 25;
            });
            return !peasantsPlayedCards ? 'spring' : 'normal';
        }

        // Anti-Spring: Landlord played only ONE hand (the first one) and peasants won
        if (!isLandlord) {
            const landlord = opponents.find(p => p.id === roomData.landlordId);
            if (landlord) {
                // Landlord starts with 33 cards (25 + 8 hole cards) in 4-player?
                // Or 25 + 8 = 33. 
                // If landlord has > 33 - (smallest valid hand size), they might have only played once.
                // This is hard to detect purely from hand count without action history.
                // Let's use action history if available.
                if (roomData.actionHistory) {
                    const landlordMoves = roomData.actionHistory.filter(
                        a => a.playerId === roomData.landlordId && a.type === 'PLAY'
                    );
                    return landlordMoves.length === 1 ? 'anti-spring' : 'normal';
                }
            }
        }

        return 'normal';
    }
}
