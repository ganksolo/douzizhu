import { create } from 'zustand';

// --- Types ---
export type GamePhase = 'INIT' | 'DEALING' | 'PLAYING' | 'GAME_OVER';

export interface GamePlayer {
    userId: string;
    username: string;
    seatIndex: number;
    handCount: number;
    isBot: boolean;
    // We might add more specific game-related fields here later (e.g. role: landlord/peasant)
}

export interface LastPlayedState {
    seatIndex: number;
    cards: number[]; // Change to Card object type later if needed
}

export interface GameState {
    // Core Data
    phase: GamePhase;
    players: GamePlayer[];
    mySeatId: number | null;
    currentTurn: number | null; // seatIndex
    bottomCards: number[];
    lastPlayed: LastPlayedState | null;
    myHand: number[]; // Local player's hand cards (sorted)

    // Actions
    setSyncState: (data: any) => void;
    setMySeatId: (seatId: number) => void;
    resetGame: () => void;

    // Selectors
    getRelativeSeat: (targetSeatIndex: number) => 'bottom' | 'right' | 'top' | 'left';
}

export const useGameStore = create<GameState>((set, get) => ({
    // Initial State
    phase: 'INIT',
    players: [],
    mySeatId: null,
    currentTurn: null,
    bottomCards: [],
    lastPlayed: null,
    myHand: [],

    // Actions
    setSyncState: (data: any) => {
        console.log('[GameStore] sync_state:', data);
        // Map backend data to store state
        // Assuming backend sends: { phase, players, currentTurn, bottomCards, lastPlayed, ... }
        set({
            phase: data.phase || 'INIT',
            players: data.players || [],
            currentTurn: data.currentTurn ?? null,
            bottomCards: data.bottomCards || [],
            lastPlayed: data.lastPlayed || null,
            myHand: data.myHand ? [...data.myHand].sort((a, b) => b - a) : [], // Auto-sort desc
        });
    },

    setMySeatId: (seatId: number) => {
        set({ mySeatId: seatId });
    },

    resetGame: () => {
        set({
            phase: 'INIT',
            players: [],
            currentTurn: null,
            bottomCards: [],
            lastPlayed: null,
            myHand: [],
            // mySeatId typically persists if in the same room, but can clear if leaving
        });
    },

    // Selectors
    getRelativeSeat: (targetSeatIndex: number) => {
        const { mySeatId } = get();
        // Fallback: Default to viewing as if at seat 0 if no seat assigned (Observer)
        const anchorSeat = (mySeatId === null || mySeatId === undefined) ? 0 : mySeatId;

        // 4-Player Relation
        // Bottom: Me
        // Right: (Me + 1) % 4
        // Top: (Me + 2) % 4
        // Left: (Me + 3) % 4

        const diff = (targetSeatIndex - anchorSeat + 4) % 4;

        if (diff === 0) return 'bottom';
        if (diff === 1) return 'right';
        if (diff === 2) return 'top';
        return 'left'; // diff === 3
    }
}));
