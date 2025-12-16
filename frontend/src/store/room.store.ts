import { create } from 'zustand';

/**
 * Room Player Data Structure
 * Aligned with Swagger RoomPlayer schema + WebSocket extensions
 */
export interface RoomPlayer {
    userId: string;
    username: string; // Swagger: username
    isReady: boolean; // Swagger: isReady
    seat?: number;    // Backend API/Socket property (0-3)
    avatar?: string;  // WebSocket extension
    online?: boolean; // WebSocket extension
    lastActive?: number;
    seatId?: number; // Frontend normalized alias for 'seat'
    isBot?: boolean; // Phase 22.4 AI support
    coins?: number; // Phase 21.3 Game Currency
}

/**
 * Room Status
 * Based on phase21.1_room_core.md
 */
export type RoomStatus = 'waiting' | 'playing' | 'finished';

interface RoomState {
    // State
    roomId: string | null;
    players: RoomPlayer[];
    roomStatus: RoomStatus;
    mySeatId: number | null;
    roomConfig: { type: 'PVP' | 'PVE'; botCount?: number; maxPlayers?: number } | null; // Phase 22.4 Room Config

    // Actions
    setRoomData: (data: { roomId: string; players: RoomPlayer[]; config?: { type: 'PVP' | 'PVE'; botCount?: number; maxPlayers?: number }; roomStatus: 'waiting' | 'playing' | 'finished' }) => void;
    updatePlayerReady: (userId: string, isReady: boolean) => void;
    addPlayer: (player: RoomPlayer) => void;
    removePlayer: (userId: string) => void;
    setMySeatId: (seatId: number) => void;
    resetRoom: () => void;

    // Selectors
    getPlayerByRelativePos: (position: 'bottom' | 'right' | 'top' | 'left') => RoomPlayer | undefined;
}

/**
 * Room Store - Manages room state synchronized with backend
 * Events handled:
 * - player_list_update: Full room state
 * - player_joined: Add new player
 * - player_left: Remove player
 * - toggle_ready: Update ready state
 */
export const useRoomStore = create<RoomState>((set, get) => ({
    // Initial state
    roomId: null,
    players: [],
    roomStatus: 'waiting',
    mySeatId: null,
    roomConfig: null,

    /**
     * Set full room data (from player_list_update event)
     * @param data - Complete room state from backend
     */
    setRoomData: (data) => {
        console.log('[Room] Setting room data:', data);

        // Normalize seat -> seatId AND nickname -> username for all players
        const players = data.players.map(p => ({
            ...p,
            username: (p as any).nickname || p.username || 'Guest', // Fix Issue: Backend sends nickname, FE wants username
            seatId: p.seat !== undefined ? p.seat : p.seatId
        }));

        set({
            roomId: data.roomId,
            players: players,
            roomStatus: data.roomStatus,
            roomConfig: data.config || null,
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

            const normalizedPlayer = {
                ...player,
                username: (player as any).nickname || player.username || 'Guest',
                seatId: player.seat !== undefined ? player.seat : player.seatId
            };

            if (exists) {
                console.warn('[Room] Player already exists, updating data');
                // Update existing player with potentially new seat info
                return {
                    players: state.players.map(p => p.userId === player.userId ? {
                        ...p,
                        ...normalizedPlayer,
                        seatId: player.seat !== undefined ? player.seat : (player.seatId ?? p.seatId)
                    } : p)
                };
            }

            return {
                players: [...state.players, normalizedPlayer],
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
            players: state.players.filter((p) => p.userId !== userId),
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

    resetRoom: () => {
        console.log('[Room] Resetting room state');

        set({
            roomId: null,
            players: [],
            roomStatus: 'waiting',
            mySeatId: null,
            roomConfig: null,
        });
    },

    /**
     * Selector: Get player by relative position (Bottom/Right/Top/Left)
     * Context: 4-Player Game (0,1,2,3)
     */
    getPlayerByRelativePos: (position: 'bottom' | 'right' | 'top' | 'left') => {
        const { players, mySeatId } = get();
        // Fallback: If not seated (observer), assume seat 0 is Bottom view
        const anchorSeat = (mySeatId === null || mySeatId === undefined) ? 0 : mySeatId;

        // Calculate target absolute seat index based on relative position
        // Bottom = anchor
        // Right = (anchor + 1) % 4
        // Top = (anchor + 2) % 4
        // Left = (anchor + 3) % 4
        let targetSeatIndex = anchorSeat;
        if (position === 'right') targetSeatIndex = (anchorSeat + 1) % 4;
        else if (position === 'top') targetSeatIndex = (anchorSeat + 2) % 4;
        else if (position === 'left') targetSeatIndex = (anchorSeat + 3) % 4;

        return players.find(p => p.seatId === targetSeatIndex);
    },
}));

// Export type for external use
export type { RoomState };
