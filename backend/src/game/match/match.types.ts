/**
 * Phase 19.1: Match Persistence Types
 * 
 * Type definitions for match records and player statistics.
 */

/**
 * Player snapshot at the end of a match
 */
export interface PlayerSnapshot {
    userId: string;
    username: string;
    role: 'landlord' | 'peasant';
    finalHand: string[]; // Remaining cards (if any)
    score: number; // Points earned/lost
    handCount: number; // Cards remaining
}

/**
 * Detailed action record for replay
 */
export interface ActionRecord {
    timestamp: number; // Unix timestamp (ms)
    playerId: string;
    actionType: 'PLAY' | 'PASS' | 'BID';
    cards?: string[]; // Cards played (if PLAY action)
    bidValue?: number; // Bid value (if BID action)
}

/**
 * Complete match result data
 */
export interface MatchResultData {
    players: PlayerSnapshot[];
    actions: ActionRecord[]; // Full action history for replay
    landlordPlayerId: string;
    winnerPlayerId: string;
    winMethod: 'normal' | 'spring' | 'anti-spring'; // Win condition
    multiplier: number; // Final score multiplier
    duration: number; // Match duration in seconds
}

/**
 * Create MatchRecord DTO
 */
export interface CreateMatchRecordDto {
    roomId: string;
    playersJson: PlayerSnapshot[];
    resultJson: MatchResultData;
    winnerPlayerId: string;
    landlordPlayerId: string;
    startTime: Date;
    endTime: Date;
}
