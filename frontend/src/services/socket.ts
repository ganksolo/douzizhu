import { io, Socket } from 'socket.io-client';

// WebSocket URL - can be configured via environment variables
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const SOCKET_NAMESPACE = '/game'; // Based on phase15_game_engine_core.md

// Type definitions for WebSocket events
export interface JoinRoomPayload {
    roomId: string;
}

export interface ClientActionPayload {
    type: 'PLAY' | 'PASS' | 'BID';
    roomId: string;
    payload?: any;
}

export interface ToggleReadyPayload {
    roomId: string;
    isReady: boolean;
}

export interface RequestRematchPayload {
    roomId: string;
}

export interface SyncStatePayload {
    roomId: string;
    currentState: string;
    players: any[];
    currentTurn?: string;
    lastPlayedCards?: {
        playerId: string;
        cards: string[];
    };
    multiplier: number;
}

export interface PlayerListUpdatePayload {
    roomId: string;
    players: any[];
}

/**
 * Singleton WebSocket Manager
 * Based on phase15_game_engine_core.md and phase21.1_room_core.md
 */
class SocketManager {
    private socket: Socket | null = null;
    private isConnected = false;
    private debugMode = true; // Enable console logging for debugging

    /**
     * Connect to WebSocket server with JWT authentication
     * @param token - JWT token from auth store
     */
    connect(token: string): void {
        if (this.socket && this.isConnected) {
            console.warn('[Socket] Already connected');
            return;
        }

        console.log(`[Socket] Connecting to ${SOCKET_URL}${SOCKET_NAMESPACE}...`);

        // Create socket connection with authentication
        this.socket = io(`${SOCKET_URL}${SOCKET_NAMESPACE}`, {
            auth: {
                token,
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        // Setup connection event handlers
        this.socket.on('connect', () => {
            this.isConnected = true;
            console.log('[Socket] Connected to /game namespace');
        });

        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            console.warn('[Socket] Disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error.message);
        });

        // Debug: Log all incoming events
        if (this.debugMode) {
            this.setupDebugLogging();
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        if (this.socket) {
            console.log('[Socket] Disconnecting...');
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }

    /**
     * Register event listener with type-safe callback
     * @param event - Event name
     * @param callback - Event handler
     */
    on<T = any>(event: string, callback: (data: T) => void): void {
        if (!this.socket) {
            console.error('[Socket] Cannot register event listener - not connected');
            return;
        }

        this.socket.on(event, callback);
    }

    /**
     * Unregister event listener
     * @param event - Event name
     * @param callback - Event handler (optional, removes all if not provided)
     */
    off(event: string, callback?: (...args: any[]) => void): void {
        if (!this.socket) {
            console.error('[Socket] Cannot unregister event listener - not connected');
            return;
        }

        if (callback) {
            this.socket.off(event, callback);
        } else {
            this.socket.off(event);
        }
    }

    /**
     * Emit event to server
     * @param event - Event name
     * @param payload - Event data
     */
    emit(event: string, payload?: any): void {
        if (!this.socket || !this.isConnected) {
            console.error('[Socket] Cannot emit event - not connected');
            return;
        }

        console.log(`[Socket] Emitting ${event}:`, payload);
        this.socket.emit(event, payload);
    }

    /**
     * Get connection status
     */
    getConnectionStatus(): boolean {
        return this.isConnected;
    }

    /**
     * Setup debug logging for all incoming events
     * Logs all server->client events to console for debugging
     */
    private setupDebugLogging(): void {
        if (!this.socket) return;

        // List of known events from backend
        const knownEvents = [
            'sync_state',
            'player_list_update',
            'player_joined',
            'player_left',
            'player_kicked',
            'game_start',
            'room_reset',
            'player_afk',
            'action_result',
            'action_error',
            'error',
        ];

        knownEvents.forEach((event) => {
            this.socket?.on(event, (data) => {
                console.log(`[Socket] ← Received ${event}:`, data);
            });
        });

        // Catch-all for unknown events
        this.socket.onAny((eventName, ...args) => {
            if (!knownEvents.includes(eventName)) {
                console.log(`[Socket] ← Received unknown event ${eventName}:`, args);
            }
        });
    }
}

// Create singleton instance
export const SocketService = new SocketManager();

// Expose to window for manual testing in browser console
if (typeof window !== 'undefined') {
    (window as any).socketTest = {
        connect: (token: string) => SocketService.connect(token),
        disconnect: () => SocketService.disconnect(),
        emit: (event: string, payload?: any) => SocketService.emit(event, payload),
        on: (event: string, callback: (data: any) => void) => SocketService.on(event, callback),
        status: () => SocketService.getConnectionStatus(),
    };
    console.log('[Socket] Test utility available at window.socketTest');
}

export default SocketService;
