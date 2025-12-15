import { useState, useEffect } from 'react';

const DEFAULT_TURN_TIME = 15; // seconds (Issue #45: Changed from 30s to 15s)

interface UseTurnTimerOptions {
    onTimeout?: () => void;
    turnDuration?: number;
}

/**
 * useTurnTimer - Hook for managing turn countdown timer
 * 
 * @param isMyTurn - Whether it's currently the user's turn
 * @param currentTurn - The current turn seat index (used as dependency to reset timer)
 * @param options - Optional configuration (onTimeout callback, turnDuration)
 * @returns { remainingTime }
 * 
 * Issue #27: Implements real countdown timer instead of hardcoded "30s"
 */
export const useTurnTimer = (
    isMyTurn: boolean,
    currentTurn: number | null,
    options?: UseTurnTimerOptions
) => {
    const { onTimeout, turnDuration = DEFAULT_TURN_TIME } = options || {};
    const [remainingTime, setRemainingTime] = useState(turnDuration);

    // Reset timer when turn changes
    useEffect(() => {
        setRemainingTime(turnDuration);
    }, [currentTurn, turnDuration]);

    // Countdown logic - only runs when it's my turn
    useEffect(() => {
        if (!isMyTurn) {
            return;
        }

        const interval = setInterval(() => {
            setRemainingTime((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // Trigger timeout callback
                    if (onTimeout) {
                        onTimeout();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isMyTurn, onTimeout]);

    return { remainingTime };
};
