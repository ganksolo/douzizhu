/**
 * Base State - Abstract class for all game states
 * Implements State Pattern with lifecycle methods
 */

import type { AnyGameAction } from '../GameAction';
import type { GameContext } from './GameContext';

export abstract class BaseState {
    protected context: GameContext;

    constructor(context: GameContext) {
        this.context = context;
    }

    /**
     * Called when entering this state
     * Use for initialization, resetting timers, etc.
     */
    abstract enter(data?: any): void;

    /**
     * Called every frame during update loop
     * Use for timers, animations, auto-transitions
     * @param deltaTime - Time since last update in milliseconds
     */
    abstract update(deltaTime: number): void;

    /**
     * Called when leaving this state
     * Use for cleanup, stopping timers, etc.
     */
    abstract exit(): void;

    /**
     * Validate if an action is allowed in this state
     * This is a guard clause to prevent invalid operations
     * @returns true if action is valid, false otherwise
     */
    abstract validate(action: AnyGameAction): boolean;

    /**
     * Handle an action in this state
     * Only called if validate() returns true
     */
    abstract handleAction(action: AnyGameAction): void;

    /**
     * Get the name of this state (for logging/debugging)
     */
    abstract getStateName(): string;

    /**
     * Helper method to log state activity
     */
    protected log(message: string, ...args: any[]): void {
        console.log(`[${this.getStateName()}] ${message}`, ...args);
    }

    /**
     * Helper method to log errors
     */
    protected error(message: string, ...args: any[]): void {
        console.error(`[${this.getStateName()}] ERROR: ${message}`, ...args);
    }
}
