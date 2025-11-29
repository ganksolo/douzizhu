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
    BID = 'BID',
    PLAY = 'PLAY',
    PASS = 'PASS',
}

export interface UserAction {
    playerId: string;
    type: ActionType;
    payload?: any;
}

export interface Player {
    id: string;
    name: string;
    hand: string[]; // Simplification for now, just card IDs or codes
    role?: 'landlord' | 'peasant';
    isReady: boolean;
}

export interface RoomData {
    roomId: string;
    players: Player[];
    deck: string[];
    currentTurn?: string; // playerId
    landlordId?: string;
    lastPlayedCards?: {
        playerId: string;
        cards: string[];
    };
    multiplier: number;
}
