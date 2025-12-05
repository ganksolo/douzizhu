export enum GameStateEnum {
    INIT = 'INIT',
    SHUFFLING = 'SHUFFLING',
    DEALING = 'DEALING',
    PLAYING = 'PLAYING',
    GAME_END = 'GAME_END',
}

export enum ActionType {
    JOIN = 'JOIN',
    READY = 'READY',
    BID = 'BID', // Deprecated? Keeping for backward compat if needed, but user asked for CALL/ROB
    CALL = 'CALL',
    ROB = 'ROB',
    PLAY = 'PLAY',
    PASS = 'PASS',
}

export interface UserAction {
    playerId: string;
    type: ActionType;
    payload?: any;
}

export interface GameAction {
    type: ActionType;
    playerId: string;
    payload: any;
    timestamp: number;
}

export interface Player {
    id: string;
    name: string;
    hand: string[]; // Simplification for now, just card IDs or codes
    role?: 'landlord' | 'peasant';
    isReady: boolean;
    handCount?: number;
    isRobot?: boolean;
    seatIndex: number; // 0-3
}

export interface RoomData {
    roomId: string;
    players: Player[];
    deck: string[];
    bottomCards: string[]; // Phase 22.6: 8 Cards
    currentTurn?: string; // playerId
    landlordId?: string;
    lastPlayedCards?: {
        playerId: string;
        cards: string[];
    };
    multiplier: number;
    isAIThinking?: boolean;
    actionHistory?: GameAction[]; // Track all actions for replay
    startTime?: Date; // Match start time
}
