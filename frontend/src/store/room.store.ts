import { create } from 'zustand';

/**
 * Room Player Data Structure
 * Aligned with Swagger RoomPlayer schema + WebSocket extensions
 */
export interface RoomPlayer {
    userId: string;
    username: string; // Swagger: username
    isReady: boolean; // Swagger: isReady
    seat?: number;    // WebSocket extension
    avatar?: string;  // WebSocket extension
    online?: boolean; // WebSocket extension
    lastActive?: number;
}

/**
 * Room Status
 * Based on phase21.1_room_core.md
 */
export type RoomStatus = 'waiting' | 'playing';

interface RoomState {
    // State
    roomId: string | null;
    players: RoomPlayer[];
    roomStatus: RoomStatus;
    mySeatId: number | null;

    // Actions
    setRoomData: (data: {
        roomId: string;
        players: RoomPlayer[];
        roomStatus: RoomStatus;
    }) => void;
    updatePlayerReady: (userId: string, isReady: boolean) => void;
    addPlayer: (player: RoomPlayer) => void;
    removePlayer: (userId: string) => void;
    setMySeatId: (seatId: number) => void;
    reset: () => void;
}

/**
 * Room Store - Manages room state synchronized with backend
 * Events handled:
 * - player_list_update: Full room state
 * - player_joined: Add new player
 * - player_left: Remove player
 * - toggle_ready: Update ready state
 */
export const useRoomStore = create<RoomState>((set) => ({
    // Initial state
    roomId: null,
    players: [],
    roomStatus: 'waiting',
    mySeatId: null,

    /**
     * Set full room data (from player_list_update event)
     * @param data - Complete room state from backend
     */
    setRoomData: (data) => {
        console.log('[Room] Setting room data:', data);

        set({
            roomId: data.roomId,
            players: data.players,
            roomStatus: data.roomStatus,
        });
    },

    /**
     * Update player ready state (optimistic update)
     * @param userId - Player user ID
     * @param isReady - New ready state
     */
    updatePlayerReady: (userId, isReady) => {
        console.log(`[Room] Updating player ${userId} ready state:`, isReady);

        set((state) => ({
            players: state.players.map((player) =>
                player.userId === userId
                    ? { ...player, isReady }
                    : player
            ),
        }));
    },

    /**
     * Add new player to room (from player_joined event)
     * @param player - New player data
     */
    addPlayer: (player) => {
        console.log('[Room] Adding player:', player);

        set((state) => {
            // Check if player already exists
            const exists = state.players.some((p) => p.userId === player.userId);

            if (exists) {
                console.warn('[Room] Player already exists, skipping add');
                return state;
            }

            return {
                players: [...state.players, player],
            };
        });
    },

    /**
     * Remove player from room (from player_left event)
     * @param userId - User ID of player to remove
     */
    removePlayer: (userId) => {
        console.log('[Room] Removing player:', userId);

        set((state) => ({
            players: state.players.filter((player) => player.userId !== userId),
        }));
    },

    /**
     * Set current user's seat ID
     * @param seatId - Seat number (0-2 for 3-player game)
     */
    setMySeatId: (seatId) => {
        console.log('[Room] Setting my seat ID:', seatId);
        set({ mySeatId: seatId });
    },

    /**
     * Reset room state (on leave or rematch)
     */
    reset: () => {
        console.log('[Room] Resetting room state');

        set({
            roomId: null,
            players: [],
            roomStatus: 'waiting',
            mySeatId: null,
        });
    },
}));

// Export type for external use
export type { RoomState };
