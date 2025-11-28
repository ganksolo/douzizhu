/**
 * StateFactory - Creates and registers all state instances
 * Simplifies GameContext initialization
 */

import { GameContext } from './GameContext';
import { GameStateEnum } from '../GameStateEnum';
import { InitState } from './states/InitState';
import { ShufflingState } from './states/ShufflingState';
import { DealingState } from './states/DealingState';
import { CallLandlordState } from './states/CallLandlordState';
import { ShowBottomState } from './states/ShowBottomState';
import { PlayingState } from './states/PlayingState';
import { RoundEndState } from './states/RoundEndState';

/**
 * Initialize a GameContext with all state instances registered
 */
export function createGameContext(): GameContext {
    const context = new GameContext();

    // Register all states
    context.registerState(GameStateEnum.INIT, new InitState(context));
    context.registerState(GameStateEnum.SHUFFLING, new ShufflingState(context));
    context.registerState(GameStateEnum.DEALING, new DealingState(context));
    context.registerState(GameStateEnum.CALL_LANDLORD, new CallLandlordState(context));
    context.registerState(GameStateEnum.SHOW_BOTTOM, new ShowBottomState(context));
    context.registerState(GameStateEnum.PLAYING, new PlayingState(context));
    context.registerState(GameStateEnum.ROUND_END, new RoundEndState(context));

    return context;
}
