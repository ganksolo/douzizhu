import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { RoomPlayer } from '../store/room.store';

// API Base URL - can be configured via environment variables or auto-detected
const getApiBaseUrl = () => {
    // If VITE_API_URL is explicitly set (like in production build), use it
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

    // Fallback: Construct IP based URL dynamically (for LAN dev)
    // If running on localhost, location.hostname is 'localhost'.
    // If running on 192.168.x.x, location.hostname is '192.168.x.x'.
    // We assume backend is on port 3001 of the SAME HOST.
    return `http://${window.location.hostname}:3001`;
};

const API_BASE_URL = getApiBaseUrl();

// Type definitions based on backend API contracts (Swagger)
export interface UserEntity {
    userId: string;
    username: string;
    email?: string;
    avatar?: string; // Phase 22.4 User Avatar
    stats?: {
        totalGames: number;
        wins: number;
        losses: number;
        winRate: number;
        totalScore: number;
    };
    createdAt?: string;
}

export interface AuthResponseData {
    userId: string;
    username: string;
    token: string;
    expiresAt: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface MatchRecord {
    gameId: string;
    result: 'win' | 'loss';
    role: 'landlord' | 'peasant';
    score: number;
    duration: number;
    players: string[];
    playedAt: string;
}

export interface Room {
    roomId: string;
    name: string;
    hostId: string;
    currentPlayers: number;
    maxPlayers: number;
    isPrivate: boolean;
    status: 'waiting' | 'playing' | 'finished';
    createdAt?: string;
}

export interface RoomListResponse {
    rooms: Room[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface CreateRoomConfig {
    type: 'PVP' | 'PVE';
    botCount?: number;
}

// Create Axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Auto-inject JWT token
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Try to get token from localStorage
        const token = localStorage.getItem('auth_token');

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Log request for debugging
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data);

        return config;
    },
    (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor - Global error handling
apiClient.interceptors.response.use(
    (response) => {
        console.log(`[API] Response from ${response.config.url}:`, response.data);
        return response;
    },
    (error) => {
        console.error('[API] Response error:', error.response?.data || error.message);

        // Handle common errors
        if (error.response?.status === 401) {
            console.warn('[API] Unauthorized - clearing auth state');
            localStorage.removeItem('auth_token');
            // Could trigger logout action here if needed
        }

        return Promise.reject(error);
    }
);



// API Methods
export const api = {
    /**
     * Authentication APIs
     */
    auth: {
        /**
         * Guest login - creates a guest account
         * Endpoint: POST /auth/guest-login
         */
        loginGuest: async (): Promise<AuthResponseData> => {
            const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/guest-login');
            return response.data.data;
        },

        /**
         * Register a new user account
         * Endpoint: POST /auth/register
         */
        register: async (username: string, password: string, email?: string): Promise<AuthResponseData> => {
            const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/register', {
                username,
                password,
                email
            });
            return response.data.data;
        },

        /**
         * Login with existing credentials
         * Endpoint: POST /auth/login
         */
        login: async (username: string, password: string): Promise<AuthResponseData> => {
            const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', {
                username,
                password
            });
            return response.data.data;
        },

        /**
         * Get current user profile (requires auth)
         * Endpoint: GET /users/me
         */
        getMe: async (): Promise<UserEntity> => {
            const response = await apiClient.get<ApiResponse<UserEntity>>('/auth/me');
            return response.data.data;
        },
    },

    /**
     * Room Management APIs
     */
    room: {
        /**
         * List available game rooms
         * Endpoint: GET /rooms
         */
        list: async (params?: { status?: string; page?: number; limit?: number }): Promise<RoomListResponse> => {
            const response = await apiClient.get<ApiResponse<RoomListResponse>>('/rooms', { params });
            return response.data.data;
        },

        /**
         * Create new game room
         * Endpoint: POST /rooms
         * Fix: Issue #17 - Added type field for PVE auto-fill support
         */
        create: async (config: CreateRoomConfig): Promise<Room> => {
            const payload = {
                name: config.type === 'PVE' ? '[PvE] Solo Practice' : `[PvP] Room ${Date.now()}`,
                maxPlayers: 4, // Dou Dizhu is 4-player (2 decks)
                type: config.type, // ✅ Fix Issue #17: Enable backend PVE detection
                isPrivate: false,
            };
            const response = await apiClient.post<ApiResponse<Room>>('/rooms', payload);
            return response.data.data;
        },

        /**
         * Add an AI bot to the room
         * Endpoint: POST /rooms/:roomId/ai
         * @deprecated Use fillBots for better UX in PVE
         */
        addBot: async (roomId: string): Promise<RoomPlayer> => {
            const response = await apiClient.post<ApiResponse<RoomPlayer>>(`/rooms/${roomId}/ai`);
            return response.data.data;
        },

        /**
         * Fill all empty seats with AI bots (Issue #18 Fix)
         * Endpoint: POST /rooms/:roomId/fill-bots
         */
        fillBots: async (roomId: string): Promise<{ botsAdded: number; bots: RoomPlayer[] }> => {
            const response = await apiClient.post<ApiResponse<{ botsAdded: number; bots: RoomPlayer[] }>>(`/rooms/${roomId}/fill-bots`);
            return response.data.data;
        },

        /**
         * Leave current room
         * Endpoint: POST /rooms/:roomId/leave
         */
        leave: async (roomId: string): Promise<{ message: string }> => {
            const response = await apiClient.post<ApiResponse<{ message: string }>>(`/rooms/${roomId}/leave`);
            return response.data.data;
        },
    },

    /**
     * Match History APIs
     */
    match: {
        /**
         * Get player's match history
         * Endpoint: GET /matches/player/:playerId
         */
        getPlayerMatches: async (playerId: string, limit = 20): Promise<MatchRecord[]> => {
            const response = await apiClient.get<ApiResponse<MatchRecord[]>>(`/matches/player/${playerId}`, {
                params: { limit },
            });
            return response.data.data;
        },

        /**
         * Get single match detail
         * Endpoint: GET /matches/:id
         */
        getMatchDetail: async (matchId: string): Promise<MatchRecord> => {
            const response = await apiClient.get<ApiResponse<MatchRecord>>(`/matches/${matchId}`);
            return response.data.data;
        },
    },
};

// Export the axios instance for custom requests if needed
export default apiClient;
