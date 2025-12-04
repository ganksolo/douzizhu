import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

// API Base URL - can be configured via environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Type definitions based on backend API contracts (Swagger)
export interface UserEntity {
    userId: string;
    username: string;
    email?: string;
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

// Helper to generate random guest credentials
const generateGuestCredentials = () => {
    const randomId = Math.random().toString(36).substring(2, 8);
    return {
        username: `Guest_${randomId}`,
        password: `pass_${randomId}` // Min 6 chars required
    };
};

// API Methods
export const api = {
    /**
     * Authentication APIs
     */
    auth: {
        /**
         * Guest login - actually registers a new user with random credentials
         * Endpoint: POST /auth/register
         */
        loginGuest: async (): Promise<AuthResponseData> => {
            const credentials = generateGuestCredentials();
            const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/register', credentials);
            return response.data.data;
        },

        /**
         * Get current user profile (requires auth)
         * Endpoint: GET /users/me
         */
        getMe: async (): Promise<UserEntity> => {
            const response = await apiClient.get<ApiResponse<UserEntity>>('/users/me');
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
         * Note: Using name prefix as workaround for PvP/PvE distinction
         */
        create: async (config: CreateRoomConfig): Promise<Room> => {
            const payload = {
                name: config.type === 'PVE' ? '[PvE] Solo Practice' : `[PvP] Room ${Date.now()}`,
                maxPlayers: 3, // Dou Dizhu is 3-player
                isPrivate: false,
            };
            const response = await apiClient.post<ApiResponse<Room>>('/rooms', payload);
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
