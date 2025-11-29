import { GameContext } from './game-context';
import { UserAction } from '../types/game.types';

export abstract class BaseState {
    /**
     * Called when entering the state
     */
    abstract enter(context: GameContext): void;

    /**
     * Handle user input actions
     */
    abstract handleInput(context: GameContext, action: UserAction): void;

    /**
     * Update loop for time-based logic
     */
    abstract update(context: GameContext, deltaTime: number): void;

    /**
     * Called when exiting the state
     */
    abstract exit(context: GameContext): void;
}
