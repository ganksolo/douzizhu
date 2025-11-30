import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import type { PlayerSnapshot, MatchResultData } from './match.types';

/**
 * Phase 19.1: Match Record Entity
 * 
 * Stores complete match history for replay and statistics.
 * Uses JSON columns for flexible data storage.
 */
@Entity('match_record')
@Index(['winnerPlayerId'])
@Index(['landlordPlayerId'])
@Index(['startTime'])
export class MatchRecord {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id: string;

    /**
     * Room where the match was played
     */
    @Column({ type: 'varchar', length: 255, nullable: false })
    @Index()
    roomId: string;

    /**
     * Player who won the match
     */
    @Column({ type: 'varchar', length: 255, nullable: false })
    winnerPlayerId: string;

    /**
     * Player who was the landlord
     */
    @Column({ type: 'varchar', length: 255, nullable: false })
    landlordPlayerId: string;

    /**
     * All players' final state (JSON)
     * Contains: userId, username, role, finalHand, score, handCount
     */
    @Column({
        type: 'json',
        nullable: false,
        comment: 'Array of PlayerSnapshot objects'
    })
    playersJson: PlayerSnapshot[];

    /**
     * Complete match result data (JSON)
     * Contains: players, actions (replay), landlordPlayerId, winnerPlayerId, 
     * winMethod, multiplier, duration
     */
    @Column({
        type: 'json',
        nullable: false,
        comment: 'MatchResultData object with full replay data'
    })
    resultJson: MatchResultData;

    /**
     * Match start time
     */
    @Column({ type: 'datetime', nullable: false })
    startTime: Date;

    /**
     * Match end time
     */
    @Column({ type: 'datetime', nullable: false })
    endTime: Date;

    /**
     * Match duration in seconds (computed)
     */
    @Column({ type: 'int', nullable: true })
    duration: number;

    /**
     * Record creation timestamp (auto-generated)
     */
    @CreateDateColumn({ type: 'datetime' })
    createdAt: Date;

    /**
     * Computed property: Duration in seconds
     */
    computeDuration(): void {
        if (this.startTime && this.endTime) {
            this.duration = Math.floor(
                (this.endTime.getTime() - this.startTime.getTime()) / 1000
            );
        }
    }
}
