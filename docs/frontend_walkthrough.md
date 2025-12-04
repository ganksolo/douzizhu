# Phase 22.1: Frontend Infrastructure - Walkthrough

## Overview
This document describes the foundational frontend infrastructure setup for Phase 22.1, establishing the network layer and state management architecture for React-based frontend-backend integration.

---

## Architecture Summary

### Network Layer (`/src/services/`)

#### API Client (`api.ts`)
- **HTTP Client**: Axios instance configured for REST API calls
- **Base URL**: `http://localhost:3001` (configurable via `VITE_API_URL`)
- **Authentication**: JWT auto-injection via request interceptor
- **Error Handling**: Global 401 handler with auto-logout
- **Debug**: All requests/responses logged to console

#### Socket Manager (`socket.ts`)
- **WebSocket Client**: Socket.IO singleton for real-time communication
- **Namespace**: `/game` (based on Phase 15 backend architecture)
- **Authentication**: JWT handshake via `auth: { token }`
- **Reconnection**: Automatic with 5 attempts, 1s delay
- **Debug**: All incoming events logged to console with `[Socket] ←` prefix
- **Test Utility**: Exposed at `window.socketTest` for browser console testing

---

### State Management (`/src/store/`)

#### Auth Store (`auth.store.ts`)
Manages user authentication lifecycle using Zustand.

**State**:
- `user`: Current user entity (id, nickname, avatar)
- `token`: JWT access token
- `isAuthenticated`: Boolean authentication status
- `isLoading`: API call loading state
- `error`: Error message string

**Actions**:
- `loginGuest()`: Initiates guest login flow (API → localStorage → socket)
- `logout()`: Clears auth state and disconnects socket
- `restoreSession()`: Restores auth from localStorage on app mount
- `clearError()`: Resets error message

---

#### Room Store (`room.store.ts`)
Manages multiplayer room state synchronized with backend events.

**State**:
- `roomId`: Current room identifier
- `players`: Array of RoomPlayer objects (userId, seat, nickname, avatar, online, ready)
- `roomStatus`: `'waiting'` | `'playing'`
- `mySeatId`: Current user's assigned seat (0-2 for 3-player game)

**Actions**:
- `setRoomData(data)`: Full state replacement (from `player_list_update` event)
- `updatePlayerReady(userId, isReady)`: Optimistic ready state update
- `addPlayer(player)`: Handle `player_joined` event
- `removePlayer(userId)`: Handle `player_left` event
- `reset()`: Clear room state on leave/rematch

---

## User Flow (Future Implementation in Phase 22.2+)

### Stage 1: Guest Login
1. User opens app → Frontend auto-calls `useAuthStore.restoreSession()`
2. No existing session → Show login UI
3. User clicks "Guest Login" → Calls `useAuthStore.loginGuest()`
4. Backend creates guest user → Returns JWT token
5. Frontend stores token in localStorage → Initializes socket connection
6. Navigate to room lobby

### Stage 2: Join Room
1. User clicks "Join Room" → Frontend emits `join_room` event with `{ roomId: 'room-1' }`
2. Backend adds user to room → Broadcasts `player_list_update`
3. Frontend receives event → Calls `useRoomStore.setRoomData()`
4. UI updates to show player list

### Stage 3: Ready & Game Start
1. User clicks "Ready" → Frontend emits `toggle_ready` with `{ roomId, isReady: true }`
2. Backend updates ready state → Broadcasts `player_list_update`
3. Frontend optimistically updates local state via `updatePlayerReady()`
4. When all 3 players ready → Backend emits `game_start`
5. Frontend transitions to game UI

### Stage 4: Gameplay (Phase 23+)
1. Backend emits `sync_state` with full game state (fog-of-war applied)
2. Frontend renders hand cards, current turn, last played cards
3. User selects cards → Emits `client_action` with `{ type: 'PLAY', payload: { cards } }`
4. Backend validates → Updates state → Broadcasts new `sync_state`

### Stage 5: Game End & Rematch
1. Backend detects winner → Emits `game_end` event
2. Frontend shows result screen
3. User clicks "Rematch" → Emits `request_rematch`
4. Backend resets room → Emits `room_reset`
5. Frontend calls `useRoomStore.reset()` and returns to Stage 3

---

## File Structure

```
frontend/src/
├── services/
│   ├── api.ts              ✅ HTTP client (Axios + JWT interceptor)
│   └── socket.ts           ✅ WebSocket manager (Socket.IO singleton)
├── store/
│   ├── auth.store.ts       ✅ Authentication state (Zustand)
│   └── room.store.ts       ✅ Room state (Zustand)
└── (UI components in Phase 22.2+)
```

---

## Key Decisions & Rationale

### 1. Zustand for State Management
- **Why**: Lightweight, TypeScript-first, minimal boilerplate compared to Redux
- **Alternative Considered**: Redux Toolkit (rejected due to complexity for this scale)

### 2. Singleton Pattern for Socket Manager
- **Why**: Prevents multiple WebSocket connections, centralized event handling
- **Risk Mitigation**: Exposed test utility at `window.socketTest` for debugging

### 3. localStorage for Token Persistence
- **Why**: Simple, synchronous, survives page refresh
- **Security**: Token is httpOnly-incompatible (SPA requirement), expires in 7 days (backend enforced)
- **Alternative Considered**: sessionStorage (rejected due to loss on tab close)

### 4. Request Interceptor for JWT Injection
- **Why**: DRY principle - avoid manual token header in every API call
- **Implementation**: Reads from `localStorage['auth_token']`, falls back gracefully if missing

### 5. Debug Logging
- **Why**: Critical for early-stage integration debugging
- **Production**: Will add `if (import.meta.env.DEV)` guards in Phase 24 (Production Hardening)

---

## Backend Integration Points

### Phase 20.2: Authentication
- **API**: `POST /auth/register` → `{ access_token, user }`
- **Frontend**: `useAuthStore.loginGuest()` → Store token → Initialize socket

### Phase 21.1: Room Core
- **WebSocket**: `join_room`, `leave_room`, `kick_player`
- **Events**: `player_list_update`, `player_joined`, `player_left`
- **Frontend**: `useRoomStore` syncs with backend room state

### Phase 21.2: Ready System
- **WebSocket**: `toggle_ready`, `request_rematch`
- **Events**: `game_start`, `room_reset`
- **Frontend**: Ready button triggers state updates

### Phase 15: Game Engine
- **WebSocket**: `client_action` (PLAY/PASS)
- **Events**: `sync_state` (full game state with fog-of-war)
- **Frontend**: Future game UI will render based on `sync_state`

---

## Verification Results

### Build Status
```bash
$ npm run build
✓ TypeScript compilation successful
✓ Vite build completed in 1.59s
✓ 2093 modules transformed
```

### Code Quality
- **TypeScript**: Strict mode enabled, all type imports correct
- **ESLint**: No warnings
- **Bundle Size**: 375KB (gzipped: 120KB)

---

## Test Utility Usage

The browser test utility `window.socketTest` is available for manual integration testing:

```javascript
// 1. Get auth token
const token = localStorage.getItem('auth_token');

// 2. Connect to WebSocket
window.socketTest.connect(token);

// 3. Listen for events
window.socketTest.on('sync_state', (data) => console.log(data));

// 4. Emit events
window.socketTest.emit('join_room', { roomId: 'room-1' });

// 5. Check connection
window.socketTest.status(); // true/false

// 6. Disconnect
window.socketTest.disconnect();
```

**All socket events are auto-logged** to console with `[Socket] ←` prefix for debugging.

---

## Next Phase Preview (22.2: UI Components)

**Planned Components**:
- `LoginScreen.tsx` - Guest login button
- `RoomLobby.tsx` - Room list and join interface
- `PlayerList.tsx` - Display room players with ready status
- `ReadyButton.tsx` - Toggle ready state
- `GameTable.tsx` - Main game UI (hand cards, play area, opponents)

**Integration Work**:
- Wire socket events to store actions
- Create custom hooks:
  - `useSocketEvents()` - Register event listeners
  - `useGameState()` - Combine auth + room + game stores
- Add error boundaries for socket disconnection

---

**Status**: ✅ Phase 22.1 Complete  
**Date**: 2025-12-03  
**Infrastructure Files**: 4 (api.ts, socket.ts, auth.store.ts, room.store.ts)  
**TypeScript Build**: Passing  
**Test Utility**: Available at `window.socketTest`
## Phase 22.2: UI Integration

### 1. Routing (`App.tsx`)
- `/login`: Guest login page
- `/room/:roomId`: Protected game room page (AuthGuard)

### 2. Pages
- **LoginPage**: Calls `useAuthStore.loginGuest()` -> Redirects to `/room/1`
- **RoomPage**:
  - Auto-connects socket
  - Emits `join_room`
  - Renders player list from `useRoomStore`
  - Handles `toggle_ready` action
  - Listens for `game_start`

### 3. Verification
- Validated "Login -> Join -> Ready -> Game Start" flow manually.
