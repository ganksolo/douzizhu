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

---

## Phase 22.3: Lobby System & Routing

### Overview
Implemented a full room lobby system with room list display, PvP/PvE room creation, and navigation routing. This phase completes the pre-game user flow from login to entering a specific game room.

---

### 1. Architecture Changes

#### Routing (`App.tsx`)
**Routes**:
- `/login`: Guest login page
- `/lobby`: Room list and creation (Protected by AuthGuard)
- `/room/:roomId`: Game room page (Protected by AuthGuard)

**Login Flow**:
- `LoginPage` now redirects to `/lobby` instead of `/room/1`
- Users select or create rooms from the lobby before entering

---

### 2. New Components

#### LobbyPage (`frontend/src/pages/LobbyPage.tsx`)

**Page Layout**:
- **Header**: Display username and total active rooms count
- **Room List Panel** (Left 2/3):
  - Scrollable list of available rooms
  - Each room displays: name, hostId (truncated), current/max players
  - "FULL" badge when `currentPlayers === maxPlayers`
  - Click to join room
  - Auto-refresh every 5 seconds
- **Create Panel** (Right 1/3):
  - "Create 3-Player PvP" button (real players)
  - "Solo Practice (3 AI)" button (PvE mode)

**User Flow**:
1. User logs in -> Navigates to `/lobby`
2. Lobby loads room list via `api.room.list()`
3. User clicks "Create PvP" -> Calls `api.room.create({ type: 'PVP' })`
4. Backend returns `{ success: true, data: { roomId: '...' } }`
5. Frontend navigates to `/room/${roomId}`
6. RoomPage emits `join_room` WebSocket event

---

### 3. API Integration Points

#### API Calls (`frontend/src/services/api.ts`)

**Room List API**:
```typescript
api.room.list({ status: 'waiting', page: 1, limit: 20 })
```
- **Endpoint**: `GET /rooms?status=waiting&page=1&limit=20`
- **Trigger**: `LobbyPage` mount + 5-second interval
- **Response**: `{ success: true, data: { rooms: Room[], pagination: {...} } }`

**Room Creation API**:
```typescript
api.room.create({ type: 'PVP' | 'PVE', botCount?: number })
```
- **Endpoint**: `POST /rooms`
- **Trigger**: User clicks "Create PvP" or "Create PvE" button
- **Payload**: `{ name: '[PvP] Room...' | '[PvE] Solo Practice', maxPlayers: 3, isPrivate: false }`
- **Response**: `{ success: true, data: { roomId, name, hostId, ... } }`

---

### 4. State Management

#### Lobby Store (`frontend/src/store/lobby.store.ts`)

**State**:
- `rooms: Room[]` - List of available rooms
- `isLoading: boolean` - API loading state
- `error: string | null` - Error message
- `currentPage: number` - Pagination state
- `totalPages: number` - Pagination state

**Actions**:
- `fetchRooms(page?)` - Call `api.room.list()` and update rooms
- `createRoom(config)` - Call `api.room.create()` and return roomId
- `clearError()` - Reset error state

---

### 5. Data Mapping

**Room API → Lobby UI**:

| API Field | UI Display | Location |
|-----------|------------|----------|
| `roomId` | Used for navigation | `navigate(/room/${roomId})` |
| `name` | Room title | Room card heading |
| `hostId` | Host display (truncated) | Room card subheading |
| `currentPlayers` | Player count | `{currentPlayers}/{maxPlayers}` badge |
| `maxPlayers` | Max capacity | `{currentPlayers}/{maxPlayers}` badge |
| `status` | Filter criteria | Only show `status === 'waiting'` |

---

### 6. Error Handling

**Scenarios**:
- **API Failure**: Display error banner with message and close button
- **Empty Room List**: Show "No active rooms" placeholder
- **Room Full**: Disable join button and show "FULL" badge

---

### 7. Navigation Flow

```
Login -> /lobby (Auto-refresh every 5s)
      |
      |-> Click "Create PvP" -> POST /rooms -> /room/:roomId
      |
      |-> Click "Join Room" -> /room/:roomId -> emit('join_room')
```

---

**Status**: ✅ Phase 22.3 Complete  
**Date**: 2025-12-04  
**Key Files**: `LobbyPage.tsx`, `lobby.store.ts`, `api.ts` (room endpoints)  
**Backend Dependencies**: `RoomController` (GET /rooms, POST /rooms)  
**Next Phase**: Phase 22.4 - Room Enhancements

---

## Phase 22.4: Room Enhancements (AI & Layout)

### Feature: AI Player Support
- **Store Update:** `room.store.ts` tracks `isBot` and `roomConfig`.
- **UI:** AI players rendered with Robot 🤖 icon and "AI" badge.
- **Ready State:** AI players automatically treated as "Ready" in PvE mode for smoother flow.

### Feature: Spatial Layout
- **Logic:** `RoomPage.tsx` calculates relative positions.
  - Me: Bottom
  - Next Seat: Right
  - Next Next: Left
- **Rendering:** Players positioned absolutely on the table surface.
- **Seat ID:** Derived from player list matching current user ID.

### Feature: PvE Flow
- **Lobby:** "Solo Practice" button creates PvE room.
- **Room:**
  - 3 AI players shown (mocked if backend doesn't send bots).
  - User clicks "Ready".
  - Game Start triggered (visual cues).

### Files Modified
- `frontend/src/store/room.store.ts`: Added `resetRoom`, `roomConfig`, `isBot`.
- `frontend/src/pages/RoomPage.tsx`: Full refactor for layout and AI display.

**Status**: ✅ Phase 22.4 Complete

---

## Phase 22.5: Frontend 4-Player UI (Cross/Corner Layout)

### 1. Spatial Layout Logic
- **Objective**: Render 4 players in a comfortable "Cross" or "Corner" layout relative to the current user.
- **Implementation**: `RoomPage.tsx` uses `useRoomStore.getPlayerByRelativePos(pos)`.
- **Mapping**:
    - **Me**: Bottom (Always)
    - **Me + 1**: Right
    - **Me + 2**: Top (Opposite)
    - **Me + 3**: Left
- **UI**: Absolute positioning with Tailwind (`top-0`, `left-1/2`, etc.) on a green table background.

### 2. PvE & Ready System
- **Bot Indication**: Bots rendered with 🤖 avatar and "AI" badge.
- **Auto-Ready**:
    - In PvE rooms (`type='PVE'`), bots are visually treated as "Ready" (green ring) even if backend doesn't broadcast explicit ready events (though backend usually does).
    - Human player clicks "Ready" to start.

### 3. Game Board Adaptation
- **Cards**: Hand rendering adapted for 25 cards (smaller overlap if needed).
- **Table Area**: Center area used for played cards animation.

**Status**: ✅ Phase 22.5 Complete

---

## Phase 23.1: GameBoard Data Mapping

### 1. Game Store (`game.store.ts`)
- **State**: `phase`, `players` (with `seatIndex`), `currentTurn`, `bottomCards`, `lastPlayed`.
- **Actions**: `setSyncState(payload)` - Hydrates full game state from backend.
- **Selectors**: `getRelativeSeat(targetSeat)` - Maps backend `seatIndex` (0-3) to UI Grid (Bottom/Right/Top/Left).

### 2. Socket Integration
- **Event**: `sync_state`.
- **Trigger**: Emitted by backend on every state change (join, deal, play, turn).
- **Payload**: Full `GameContext` snapshot.

### 3. Debug Tools
- **DebugStatePanel**: Overlay component to visualize raw `gameState` for verification during development.

**Status**: ✅ Phase 23.1 Complete

---

## Phase 23.2: GameBoard UI Components

### 1. Card Components (`Card.tsx`, `PlayerHand.tsx`)
- **Card**: Renders individual poker cards with Suit (♠♥♣♦), Rank, and Joker visuals. Supports "Small" and "Back" variants.
- **PlayerHand**: Container for a fan of cards. Supports:
  - **Selection**: Click-to-select, box-selection (simulated).
  - **Layout**: Dynamic spacing based on card count.
  - **States**: Human (Interactive) vs AI (Hidden/Backs).

### 2. Game Table (`GameTable.tsx`)
- **Rich UI**:
  - **Avatar System**: User/AI visualization with layout positioning (Top/Left/Right/Bottom).
  - **Orchestration**: Currently driven by `useGameLoop` (Offline Mock) for component development.
  - **Animations**: Shuffling, Dealing, and Playing motion effects using `framer-motion`.
  - **Controls**: Bidding and Playing buttons (Play/Pass/Hint).
  - **Bottom Cards**: Dedicated display area for landlord cards.

### 3. Verification State
- **Mode**: Components verified in Offline Mode.
- **Next Step**: Wire `GameTable` components to `useGameStore` for online multiplayer (Phase 23.3).

**Status**: ✅ Phase 23.2 Complete
**Date**: 2025-12-05
**Key Files**: `Card.tsx`, `PlayerHand.tsx`, `GameTable.tsx`

