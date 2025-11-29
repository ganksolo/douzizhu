import { AnalysisResult, PatternType } from './types';

export class MoveComparator {
    /**
     * Compares two moves to determine if the current move beats the previous one.
     * @param prev The previous move (AnalysisResult)
     * @param current The current move (AnalysisResult)
     * @returns 1 if current > prev, -1 if current < prev, 0 if invalid comparison
     */
    static compare(prev: AnalysisResult, current: AnalysisResult): number {
        // 1. Rocket beats everything (except itself, but duplicate rockets impossible in 1 deck, possible in 2)
        if (current.type === PatternType.ROCKET) {
            return prev.type === PatternType.ROCKET ? 0 : 1;
        }
        if (prev.type === PatternType.ROCKET) {
            return -1;
        }

        // 2. Bomb Logic
        const isCurrentBomb = this.isBomb(current.type);
        const isPrevBomb = this.isBomb(prev.type);

        if (isCurrentBomb && !isPrevBomb) return 1;
        if (!isCurrentBomb && isPrevBomb) return -1;

        if (isCurrentBomb && isPrevBomb) {
            // Compare bomb length (count) first
            if (current.bombCount! > prev.bombCount!) return 1;
            if (current.bombCount! < prev.bombCount!) return -1;

            // Same count, compare rank
            return current.rank > prev.rank ? 1 : -1;
        }

        // 3. Normal Pattern Logic
        // Must match type and length
        if (current.type !== prev.type || current.length !== prev.length) {
            return 0; // Invalid comparison
        }

        // Compare main rank
        return current.rank > prev.rank ? 1 : -1;
    }

    private static isBomb(type: PatternType): boolean {
        return type >= PatternType.BOMB_4 && type <= PatternType.BOMB_8;
    }
}
