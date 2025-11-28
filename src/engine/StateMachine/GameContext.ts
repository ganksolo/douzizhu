/**
 * Game Context - Central state manager
 * Manages state transitions and coordinates state lifecycle
 */

import { BaseState } from './BaseState';
import { GameStateEnum, isValidTransition } from '../GameStateEnum';
import { eventBus, GameEvent } from '../EventBus';
import type { AnyGameAction } from '../GameAction';
import type { Player, Card } from '../../types';

export interface GameData {
    players: Player[];
    deck: Card[];
    bottomCards: Card[];
    currentTurn: number;
    landlordId: string | null;
    bids: Record<string, number>;
    lastPlayedCards: { playerId: string; cards: Card[]; type: any } | null;
    winnerId: string | null;
}

export class GameContext {
    private currentState: BaseState | null = null;
    private currentStateEnum: GameStateEnum = GameStateEnum.INIT;
    private stateInstances: Map<GameStateEnum, BaseState> = new Map();

    // Game data
    public data: GameData = {
        players: [],
        deck: [],
        bottomCards: [],
        currentTurn: 0,
        landlordId: null,
        bids: {},
        lastPlayedCards: null,
        winnerId: null,
    };

    // Animation frame ID for update loop
    private animationFrameId: number | null = null;
    private lastUpdateTime: number = 0;

    constructor() {
        this.log('GameContext initialized');
    }

    /**
     * Register a state instance
     */
    registerState(stateEnum: GameStateEnum, state: BaseState): void {
        this.stateInstances.set(stateEnum, state);
        this.log(`Registered state: ${stateEnum}`);
    }

    /**
     * Change to a new state
     */
    changeState(newStateEnum: GameStateEnum, data?: any): void {
        // Validate transition
        if (this.currentState && !isValidTransition(this.currentStateEnum, newStateEnum)) {
            this.error(`Invalid state transition: ${this.currentStateEnum} -> ${newStateEnum}`);
            return;
        }

        const newState = this.stateInstances.get(newStateEnum);
        if (!newState) {
            this.error(`State not registered: ${newStateEnum}`);
            return;
        }

        const oldStateEnum = this.currentStateEnum;

        // Exit current state
        if (this.currentState) {
            this.log(`Exiting state: ${oldStateEnum}`);
            this.currentState.exit();
        }

        // Update state
        this.currentState = newState;
        this.currentStateEnum = newStateEnum;

        // Enter new state
        this.log(`Entering state: ${newStateEnum}`, data);
        this.currentState.enter(data);

        // Emit state change event
        eventBus.emit(GameEvent.STATE_CHANGE, {
            from: oldStateEnum,
            to: newStateEnum,
            data,
        });
    }

    /**
     * Dispatch an action to the current state
     */
    dispatch(action: AnyGameAction): void {
        if (!this.currentState) {
            this.error('No current state to dispatch action to', action);
            return;
        }

        // Validate action
        if (!this.currentState.validate(action)) {
            this.error('Action validation failed', action);
            eventBus.emit(GameEvent.ERROR, {
                message: `Invalid action ${action.type} in state ${this.currentStateEnum}`,
            });
            return;
        }

        // Handle action
        this.currentState.handleAction(action);

        // Emit player action event
        eventBus.emit(GameEvent.PLAYER_ACTION, {
            playerId: action.playerId || 'system',
            action: action.type,
            payload: action.payload,
        });
    }

    /**
     * Start the update loop
     */
    startUpdateLoop(): void {
        if (this.animationFrameId !== null) {
            return; // Already running
        }

        this.lastUpdateTime = performance.now();
        const loop = (currentTime: number) => {
            const deltaTime = currentTime - this.lastUpdateTime;
            this.lastUpdateTime = currentTime;

            if (this.currentState) {
                this.currentState.update(deltaTime);
            }

            this.animationFrameId = requestAnimationFrame(loop);
        };

        this.animationFrameId = requestAnimationFrame(loop);
        this.log('Update loop started');
    }

    /**
     * Stop the update loop
     */
    stopUpdateLoop(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            this.log('Update loop stopped');
        }
    }

    /**
     * Get current state enum
     */
    getCurrentState(): GameStateEnum {
        return this.currentStateEnum;
    }

    /**
     * Reset game data
     */
    resetData(): void {
        this.data = {
            players: [],
            deck: [],
            bottomCards: [],
            currentTurn: 0,
            landlordId: null,
            bids: {},
            lastPlayedCards: null,
            winnerId: null,
        };
        this.log('Game data reset');
    }

    private log(message: string, ...args: any[]): void {
        console.log(`[GameContext] ${message}`, ...args);
    }

    private error(message: string, ...args: any[]): void {
        console.error(`[GameContext] ERROR: ${message}`, ...args);
    }
}

// Singleton instance
export const gameContext = new GameContext();
