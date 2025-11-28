/**
 * Game Actions - All possible player/system actions
 */

import type { Card } from '../types';

export const GameActionType = {
    // Game flow actions
    START_GAME: 'START_GAME',
    RESTART_GAME: 'RESTART_GAME',

    // Bidding actions
    BID: 'BID',
    PASS_BID: 'PASS_BID',

    // Playing actions
    PLAY_CARDS: 'PLAY_CARDS',
    PASS_TURN: 'PASS_TURN',

    // System actions
    TIMER_EXPIRED: 'TIMER_EXPIRED',
    AI_TURN: 'AI_TURN',
} as const;

export type GameActionType = typeof GameActionType[keyof typeof GameActionType];

export interface GameAction {
    type: GameActionType;
    playerId?: string;
    payload?: any;
}

export interface StartGameAction extends GameAction {
    type: 'START_GAME';
}

export interface BidAction extends GameAction {
    type: 'BID';
    playerId: string;
    payload: {
        bidValue: number; // 0 = pass, 1-3 = bid amount
    };
}

export interface PlayCardsAction extends GameAction {
    type: 'PLAY_CARDS';
    playerId: string;
    payload: {
        cards: Card[];
    };
}

export interface PassTurnAction extends GameAction {
    type: 'PASS_TURN';
    playerId: string;
}

export interface AITurnAction extends GameAction {
    type: 'AI_TURN';
    playerId: string;
}

/**
 * Union type of all action types
 */
export type AnyGameAction =
    | StartGameAction
    | BidAction
    | PlayCardsAction
    | PassTurnAction
    | AITurnAction;
