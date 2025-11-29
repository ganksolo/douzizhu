import { GameContext } from '../game-context';
import { GameAction } from '../../types/game.types';

export interface ActionHandler {
    handle(context: GameContext, action: GameAction): void;
}
