/**
 * Event Bus - Strongly-typed Publish/Subscribe system
 * Provides decoupled communication between game engine and UI
 */

export const GameEvent = {
    GAME_START: 'GAME_START',
    STATE_CHANGE: 'STATE_CHANGE',
    PLAYER_ACTION: 'PLAYER_ACTION',
    CARD_DEALT: 'CARD_DEALT',
    TURN_CHANGE: 'TURN_CHANGE',
    TIMER_TICK: 'TIMER_TICK',
    ERROR: 'ERROR',
    SCORE_UPDATE: 'SCORE_UPDATE',
} as const;

export type GameEvent = typeof GameEvent[keyof typeof GameEvent];

export interface GameEventData {
    [GameEvent.GAME_START]: { timestamp: number };
    [GameEvent.STATE_CHANGE]: { from: string; to: string; data?: any };
    [GameEvent.PLAYER_ACTION]: { playerId: string; action: string; payload?: any };
    [GameEvent.CARD_DEALT]: { playerId: string; cardCount: number };
    [GameEvent.TURN_CHANGE]: { playerId: string };
    [GameEvent.TIMER_TICK]: { elapsed: number; remaining: number };
    [GameEvent.ERROR]: { message: string; code?: string };
    [GameEvent.SCORE_UPDATE]: { scores: Record<string, number> };
}

type EventCallback<T extends GameEvent> = (data: GameEventData[T]) => void;

class EventBus {
    private listeners: Map<GameEvent, Set<EventCallback<any>>> = new Map();

    /**
     * Subscribe to an event
     */
    on<T extends GameEvent>(event: T, callback: EventCallback<T>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    /**
     * Unsubscribe from an event
     */
    off<T extends GameEvent>(event: T, callback: EventCallback<T>): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    /**
     * Emit an event to all subscribers
     */
    emit<T extends GameEvent>(event: T, data: GameEventData[T]): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[EventBus] Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Clear all listeners (useful for cleanup)
     */
    clear(): void {
        this.listeners.clear();
    }

    /**
     * Get number of listeners for an event (for debugging)
     */
    getListenerCount(event: GameEvent): number {
        return this.listeners.get(event)?.size || 0;
    }
}

// Singleton instance
export const eventBus = new EventBus();
