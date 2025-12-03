import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

// API Base URL - can be configured via environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Type definitions based on backend API contracts
export interface UserEntity {
    id: string;
    nickname: string;
    avatar: string;
    auth_type?: string;
}

export interface GuestLoginResponse {
    access_token: string;
    user: UserEntity;
}

export interface UserStats {
    user: UserEntity;
    stats: {
        totalMatches: number;
        totalWins: number;
        winRate: number;
    };
    recentMatches: any[];
}

export interface MatchRecord {
    id: string;
    roomId: string;
    winnerPlayerId: string;
    landlordPlayerId: string;
    startTime: string;
    endTime: string;
    duration: number;
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
         * Guest login - creates a temporary user and returns JWT token
         * Based on: phase20.2_auth_guide.md
         */
        loginGuest: async (): Promise<GuestLoginResponse> => {
            const response = await apiClient.post<GuestLoginResponse>('/auth/guest-login');
            return response.data;
        },

        /**
         * Get current user profile (requires auth)
         */
        getMe: async (): Promise<UserEntity> => {
            const response = await apiClient.get<UserEntity>('/auth/me');
            return response.data;
        },
    },

    /**
     * User APIs
     */
    user: {
        /**
         * Get user statistics and recent matches
         * Based on: phase20.3_integration_guide.md
         */
        getStats: async (userId: string): Promise<UserStats> => {
            const response = await apiClient.get<UserStats>(`/user/${userId}/stats`);
            return response.data;
        },
    },

    /**
     * Match History APIs
     */
    match: {
        /**
         * Get player's match history
         * Based on: phase19.3_api_guide.md
         */
        getPlayerMatches: async (userId: string, limit = 20): Promise<MatchRecord[]> => {
            const response = await apiClient.get<MatchRecord[]>(`/matches/player/${userId}`, {
                params: { limit },
            });
            return response.data;
        },

        /**
         * Get single match detail
         */
        getMatchDetail: async (matchId: string): Promise<MatchRecord> => {
            const response = await apiClient.get<MatchRecord>(`/matches/${matchId}`);
            return response.data;
        },
    },
};

// Export the axios instance for custom requests if needed
export default apiClient;
