import type { Player } from '../types';

export interface GameResult {
    winnerId: string;
    baseScore: number;
    multiplier: number;
    bombCount: number;
    isSpring: boolean; // Landlord wins without peasants playing any cards
    isAntiSpring: boolean; // Peasants win without landlord playing any cards (after first hand)
    scores: Record<string, number>; // Score change for each player
    timestamp: number;
}

export interface PlayerStats {
    totalScore: number;
    wins: number;
    losses: number;
    roundsPlayed: number;
}

const STORAGE_KEY_STATS = 'doudizhu_stats';
const STORAGE_KEY_HISTORY = 'doudizhu_history';

export class ScoreManager {
    static calculateScore(
        winnerId: string,
        landlordId: string,
        baseScore: number,
        bombCount: number,
        isSpring: boolean,
        isAntiSpring: boolean,
        players: Player[]
    ): GameResult {
        let multiplier = Math.pow(2, bombCount);
        if (isSpring || isAntiSpring) {
            multiplier *= 2;
        }

        const isLandlordWinner = winnerId === landlordId;
        const totalScoreChange = baseScore * multiplier;

        const scores: Record<string, number> = {};

        players.forEach(player => {
            if (player.id === landlordId) {
                // Landlord score
                scores[player.id] = isLandlordWinner ? totalScoreChange * 2 : -totalScoreChange * 2;
            } else {
                // Peasant score
                scores[player.id] = isLandlordWinner ? -totalScoreChange : totalScoreChange;
            }
        });

        return {
            winnerId,
            baseScore,
            multiplier,
            bombCount,
            isSpring,
            isAntiSpring,
            scores,
            timestamp: Date.now()
        };
    }

    static saveResult(result: GameResult) {
        // Update Stats
        const stats = this.getStats();
        const history = this.getHistory();

        // Update history (keep last 10)
        history.unshift(result);
        if (history.length > 10) history.pop();

        // Update stats for human player (assuming ID 'player-0')
        // In a real app, we might track all players, but here we focus on the user.
        const humanId = 'player-0';
        const scoreChange = result.scores[humanId] || 0;

        stats.totalScore += scoreChange;
        stats.roundsPlayed += 1;
        if (result.scores[humanId] > 0) {
            stats.wins += 1;
        } else {
            stats.losses += 1;
        }

        localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    }

    static getStats(): PlayerStats {
        const stored = localStorage.getItem(STORAGE_KEY_STATS);
        if (stored) {
            return JSON.parse(stored);
        }
        return {
            totalScore: 0,
            wins: 0,
            losses: 0,
            roundsPlayed: 0
        };
    }

    static getHistory(): GameResult[] {
        const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
        if (stored) {
            return JSON.parse(stored);
        }
        return [];
    }

    static resetStats() {
        localStorage.removeItem(STORAGE_KEY_STATS);
        localStorage.removeItem(STORAGE_KEY_HISTORY);
    }
}
