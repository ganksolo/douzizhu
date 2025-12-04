import { create } from 'zustand';
import { api, type UserEntity } from '../services/api';
import { SocketService } from '../services/socket';

interface AuthState {
    // State
    user: UserEntity | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    loginGuest: () => Promise<void>;
    logout: () => void;
    restoreSession: () => void;
    clearError: () => void;
}

/**
 * Auth Store - Manages authentication state
 * Based on phase20.2_auth_guide.md
 */
export const useAuthStore = create<AuthState>((set) => ({
    // Initial state
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    /**
     * Guest Login Flow:
     * 1. Call backend API
     * 2. Store token in localStorage
     * 3. Update store state
     * 4. Initialize Socket connection
     */
    loginGuest: async () => {
        set({ isLoading: true, error: null });

        try {
            console.log('[Auth] Attempting guest login...');

            // Step 1: Call API (now returns AuthResponseData)
            const response = await api.auth.loginGuest();

            console.log('[Auth] Login successful:', response);

            // Construct UserEntity from response
            const user: UserEntity = {
                userId: response.userId,
                username: response.username,
                // Avatar not returned by register endpoint
            };

            // Step 2: Store token in localStorage for persistence
            localStorage.setItem('auth_token', response.token);
            localStorage.setItem('auth_user', JSON.stringify(user));

            // Step 3: Update store state
            set({
                user,
                token: response.token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            });

            // Step 4: Initialize Socket connection
            console.log('[Auth] Initializing socket connection...');
            SocketService.connect(response.token);

        } catch (error: any) {
            console.error('[Auth] Login failed:', error);
            set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
                error: error.response?.data?.message || error.message || 'Login failed',
            });
        }
    },

    /**
     * Logout - Clear state and disconnect socket
     */
    logout: () => {
        console.log('[Auth] Logging out...');

        // Disconnect socket
        SocketService.disconnect();

        // Clear localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');

        // Reset state
        set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
        });
    },

    /**
     * Restore Session - Called on app mount
     * Checks localStorage for existing token and user
     */
    restoreSession: () => {
        console.log('[Auth] Attempting to restore session...');

        const token = localStorage.getItem('auth_token');
        const userJson = localStorage.getItem('auth_user');

        if (token && userJson) {
            try {
                const user = JSON.parse(userJson) as UserEntity;

                console.log('[Auth] Session restored:', user);

                set({
                    user,
                    token,
                    isAuthenticated: true,
                });

                // Reconnect socket
                SocketService.connect(token);

            } catch (error) {
                console.error('[Auth] Failed to restore session:', error);
                // Clear invalid data
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
            }
        } else {
            console.log('[Auth] No existing session found');
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
export type { AuthState };
