/**
 * Game State Enumeration
 * Defines all possible states in the game flow
 */

export const GameStateEnum = {
    /** Initial state - game not started */
    INIT: 'INIT',

    /** Shuffling the deck animation */
    SHUFFLING: 'SHUFFLING',

    /** Dealing cards to players */
    DEALING: 'DEALING',

    /** Bidding phase to determine landlord */
    CALL_LANDLORD: 'CALL_LANDLORD',

    /** Revealing bottom cards to landlord */
    SHOW_BOTTOM: 'SHOW_BOTTOM',

    /** Main playing phase */
    PLAYING: 'PLAYING',

    /** Round ended, calculating scores */
    ROUND_END: 'ROUND_END',

    /** Game completely finished */
    GAME_END: 'GAME_END',
} as const;

export type GameStateEnum = typeof GameStateEnum[keyof typeof GameStateEnum];

/**
 * Valid state transitions
 * Maps current state to allowed next states
 */
export const STATE_TRANSITIONS: Record<GameStateEnum, GameStateEnum[]> = {
    [GameStateEnum.INIT]: [GameStateEnum.SHUFFLING],
    [GameStateEnum.SHUFFLING]: [GameStateEnum.DEALING],
    [GameStateEnum.DEALING]: [GameStateEnum.CALL_LANDLORD],
    [GameStateEnum.CALL_LANDLORD]: [GameStateEnum.SHOW_BOTTOM],
    [GameStateEnum.SHOW_BOTTOM]: [GameStateEnum.PLAYING],
    [GameStateEnum.PLAYING]: [GameStateEnum.ROUND_END],
    [GameStateEnum.ROUND_END]: [GameStateEnum.INIT, GameStateEnum.GAME_END],
    [GameStateEnum.GAME_END]: [GameStateEnum.INIT],
};

/**
 * Check if a state transition is valid
 */
export function isValidTransition(from: GameStateEnum, to: GameStateEnum): boolean {
    return STATE_TRANSITIONS[from]?.includes(to) || false;
}
