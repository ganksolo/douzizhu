import { create } from 'zustand';
import { api, type Room } from '../services/api';

interface LobbyState {
    // State
    rooms: Room[];
    isLoading: boolean;
    error: string | null;
    currentPage: number;
    totalPages: number;

    // Actions
    fetchRooms: (page?: number) => Promise<void>;
    createRoom: (config: { type: 'PVP' | 'PVE'; botCount?: number }) => Promise<string>;
    clearError: () => void;
}

/**
 * Lobby Store - Manages room list state
 * Based on Phase 22.3
 */
export const useLobbyStore = create<LobbyState>((set, get) => ({
    // Initial state
    rooms: [],
    isLoading: false,
    error: null,
    currentPage: 1,
    totalPages: 1,

    /**
     * Fetch available rooms from backend
     * @param page - Page number (default: 1)
     */
    fetchRooms: async (page = 1) => {
        set({ isLoading: true, error: null });

        try {
            console.log('[Lobby] Fetching rooms, page:', page);

            const response = await api.room.list({
                status: 'waiting', // Only show waiting rooms
                page,
                limit: 20,
            });

            console.log('[Lobby] Rooms fetched:', response.rooms.length);

            set({
                rooms: response.rooms,
                currentPage: response.pagination.page,
                totalPages: response.pagination.totalPages,
                isLoading: false,
                error: null,
            });
        } catch (error: any) {
            console.error('[Lobby] Failed to fetch rooms:', error);
            set({
                rooms: [],
                isLoading: false,
                error: error.response?.data?.message || error.message || 'Failed to load rooms',
            });
        }
    },

    /**
     * Create new room
     * @param config - Room configuration (PVP/PVE, botCount)
     * @returns roomId of created room
     */
    createRoom: async (config) => {
        set({ isLoading: true, error: null });

        try {
            console.log('[Lobby] Creating room:', config);

            const room = await api.room.create(config);

            console.log('[Lobby] Room created:', room.roomId);

            set({ isLoading: false, error: null });

            // Refresh room list
            get().fetchRooms();

            return room.roomId;
        } catch (error: any) {
            console.error('[Lobby] Failed to create room:', error);
            set({
                isLoading: false,
                error: error.response?.data?.message || error.message || 'Failed to create room',
            });
            throw error;
        }
    },

    /**
     * Clear error message
     */
    clearError: () => {
        set({ error: null });
    },
}));

// Export type for external use
export type { LobbyState };
