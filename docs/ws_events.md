# WebSocket Events Specification

## Overview
This document defines all WebSocket events used for real-time communication between the frontend and backend in the Dou Dizhu multiplayer game.

**Namespace**: `/game`  
**Protocol**: Socket.IO  
**Authentication**: JWT token via `auth: { token }` handshake
**Base URL**: `http://localhost:3001`

---

## Client → Server Events

### 1. `join_room`
**Purpose**: Player joins a game room

**Payload**:
```typescript
{
  roomId: string
}
```

**Example**:
```json
{
  "roomId": "room-1"
}
```

**Backend Behavior**:
- Adds player to `room:{roomId}:players` Redis hash
- Assigns seat (0-2) if available
- Emits `player_list_update` to all room members
- Emits `player_joined` notification

**Based on**: `phase21.1_room_core.md`

---

### 2. `leave_room`
**Purpose**: Player voluntarily leaves room

**Payload**:
```typescript
{
  roomId: string
}
```

**Backend Behavior**:
- Removes player from Redis
- Transfers room ownership if player was owner
- Emits `player_left` notification

---

### 3. `toggle_ready`
**Purpose**: Toggle player ready state in lobby

**Payload**:
```typescript
{
  roomId: string,
  isReady: boolean
}
```

**Example**:
```json
{
  "roomId": "room-1",
  "isReady": true
}
```

**Backend Behavior**:
- Updates `ready` field in Redis
- Emits `player_list_update`
- If all real players ready (and count >= 1) → triggers `game_start` (fills empty seats with Bots)

**Based on**: `phase21.2_game_start_flow.md`

---

### 4. `request_rematch`
**Purpose**: Reset room to waiting state after game

**Payload**:
```typescript
{
  roomId: string
}
```

**Backend Behavior**:
- Sets room status → `'waiting'`
- Sets all players `ready` → `false`
- Emits `room_reset`

---

### 5. `client_action`
**Purpose**: Player performs game action (PLAY or PASS)

**Payload**:
```typescript
{
  type: 'PLAY' | 'PASS',
  roomId: string,
  payload?: {
    cards?: string[]  // For type: 'PLAY'
  }
}
```

**Example (Play Cards)**:
```json
{
  "type": "PLAY",
  "roomId": "room-1",
  "payload": {
    "cards": ["♠3", "♥3"]
  }
}
```

**Example (Pass Turn)**:
```json
{
  "type": "PASS",
  "roomId": "room-1"
}
```

**Backend Behavior**:
- Validates via `ActionPipelineService` (Phase 18.3)
- Updates game state (Redis + memory)
- Emits `sync_state` to all players

**Based on**: `phase18.3_action_pipeline_e2e.md`

---

### 6. `kick_player`
**Purpose**: Room owner kicks a player

**Payload**:
```typescript
{
  roomId: string,
  targetId: string  // userId to kick
}
```

**Backend Behavior**:
- Verifies caller is room owner
- Removes target player
- Emits `player_kicked`

---

## Server → Client Events

### 1. `sync_state`
**Purpose**: Full game state synchronization (main game state event)

**Payload** (Fog-of-War Applied):
```typescript
{
  roomId: string,
  currentState: 'INIT' | 'DEALING' | 'PLAYING' | 'GAME_END',
  phase?: string,
  currentTurn?: string,        // userId (seatIndex in logic usually, but here string?)
  players: {
    [userId: string]: {
      seatIndex: number,       // Changed from seat to seatIndex to match BE
      username: string,
      avatar: string,
      online: boolean,
      isReady: boolean,
      handCount: number,
      handCards: Card[] | null,  // null for opponents (fog-of-war)
      lastActive: number
    }
  },
  lastPlayedCards?: {          // Updated from lastMove to lastPlayedCards to match state-serializer
    playerId: string,
    cards: Card[],
    seatIndex: number          // Added in Phase 23.4
  },
  bottomCards?: number[],      // Added in Phase 23.4 (Fog of war applied)
  myHand?: number[],           // Added in Phase 23.3
  multiplier?: number
}
```

**Frontend Behavior**:
- Render game UI based on `currentState`
- Display own hand if `handCards !== null`
- Show opponent hand counts (hidden cards)
- Highlight current turn player

**Trigger**:
- Player joins room
- State transition (Init → Dealing → Playing)
- Player action (PLAY/PASS)

**Based on**: `phase15_game_engine_core.md`

---

### 2. `player_list_update`
**Purpose**: Room player list changed (lobby state)

**Payload**:
```typescript
{
  roomId: string,
  players: [
    {
      userId: string,
      seat: number,
      username: string,
      avatar: string,
      online: boolean,
      isReady: boolean,
      lastActive: number
    }
  ]
}
```

**Frontend Behavior**:
- Update `useRoomStore.setRoomData()`
- Render player list in lobby

**Trigger**:
- Player joins/leaves room
- Player toggles ready
- Player reconnects

**Based on**: `phase21.1_room_core.md`

---

### 3. `player_joined`
**Purpose**: Notification that a new player joined

**Payload**:
```typescript
{
  userId: string,
  username: string
}
```

**Frontend Behavior**:
- Show toast notification: "{username} joined"
- Call `useRoomStore.addPlayer()`

---

### 4. `player_left`
**Purpose**: Notification that a player left

**Payload**:
```typescript
{
  userId: string
}
```

**Frontend Behavior**:
- Show toast notification: "{username} left"
- Call `useRoomStore.removePlayer()`

---

### 5. `player_kicked`
**Purpose**: Player was kicked by room owner

**Payload**:
```typescript
{
  targetId: string
}
```

**Frontend Behavior**:
- If `targetId === currentUserId`, redirect to lobby
- Otherwise show notification

---

### 6. `game_start`
**Purpose**: Game is starting (all players ready)

**Payload**:
```typescript
{
  roomId: string
}
```

**Frontend Behavior**:
- Transition from lobby UI to game UI
- Wait for `sync_state` with game data

**Based on**: `phase21.2_game_start_flow.md`

---

### 7. `room_reset`
**Purpose**: Room state reset (rematch initiated)

**Payload**:
```typescript
{
  roomId: string
}
```

**Frontend Behavior**:
- Call `useRoomStore.reset()`
- Transition from game UI back to lobby

---

### 8. `player_afk`
**Purpose**: Player inactive for >30 seconds

**Payload**:
```typescript
{
  userId: string
}
```

**Frontend Behavior**:
- Display "AFK" badge on player UI

**Based on**: `phase21.3_reconnect_afk_guide.md`

---

### 9. `action_result`
**Purpose**: Action processed successfully (optional confirmation)

**Payload**:
```typescript
{
  type: 'success',
  action: string,
  message?: string
}
```

**Frontend Behavior**:
- Optional toast notification
- Reset UI state (e.g., clear selected cards)

---

### 10. `action_error`
**Purpose**: Action validation failed

**Payload**:
```typescript
{
  type: 'error',
  code: 'INVALID_MOVE' | 'NOT_YOUR_TURN' | 'ACTION_FAILED',
  message: string,
  action: string
}
```

**Example**:
```json
{
  "type": "error",
  "code": "INVALID_MOVE",
  "message": "Cannot beat last move",
  "action": "PLAY"
}
```

**Frontend Behavior**:
- Show error toast
- Revert optimistic update if any

---

### 11. `game_end`
**Purpose**: Game finished, winner determined

**Payload**:
```typescript
{
  roomId: string,
  winnerId: string,
  scores: {
    [userId: string]: number
  }
}
```

**Frontend Behavior**:
- Display game result modal
- Show "Rematch" button

**Based on**: `phase19.2_settlement_mapping.md`

---

### 12. `error`
**Purpose**: Generic error (connection, auth, etc.)

**Payload**:
```typescript
{
  message: string,
  code?: string
}
```

**Frontend Behavior**:
- Show error notification
- If auth error, redirect to login

---

## Event Flow Examples

### Example 1: Guest Login → Join Room
```
[Client] Call api.auth.loginGuest()
[Server] → { access_token, user }

[Client] SocketService.connect(token)
[Server] → Socket connected

[Client] emit('join_room', { roomId: 'room-1' })
[Server] → on('player_list_update', { players: [...] })
[Server] → on('sync_state', { currentState: 'INIT', ... })
```

---

### Example 2: Ready → Game Start
```
[Client] emit('toggle_ready', { roomId: 'room-1', isReady: true })
[Server] → on('player_list_update', { players: [{ isReady: true }, ...] })

[All Players Ready]
[Server] → on('game_start', { roomId: 'room-1' })
[Server] → on('sync_state', { currentState: 'DEALING', ... })
```

---

### Example 3: Play Cards
```
[Client] emit('client_action', { type: 'PLAY', roomId: 'room-1', payload: { cards: ['♠3', '♥3'] } })
[Server] → Validates via ActionPipelineService
[Server] → on('sync_state', { currentTurn: 'next-player', lastMove: { cards: [...] } })
```

---

### Example 4: Game End → Rematch
```
[Server] Detects winner (handCount === 0)
[Server] → on('game_end', { winnerId: '...', scores: {...} })

[Client] emit('request_rematch', { roomId: 'room-1' })
[Server] → on('room_reset', { roomId: 'room-1' })
[Server] → on('player_list_update', { players: [{ isReady: false }, ...] })
```

---

## Notes

### Fog-of-War (Data Sanitization)
- `sync_state` hides opponent hands by setting `handCards: null`
- Only current player sees their own `handCards` array
- `handCount` is visible for all players
- Implemented in `StateSerializer.serializeForPlayer()` (Phase 15)

### Reconnection Behavior
- Socket auto-reconnects with 5 attempts
- Backend restores state from Redis
- Frontend receives full `sync_state` on reconnect
- Implemented in `ReconnectService` (Phase 21.3)

### Error Handling
- All validation errors sent via `action_error` event
- Frontend should never trust client-side validation alone
- Backend is source of truth for game state

---

**Last Updated**: 2025-12-05  
**Phase**: 22.6 (Backend 4-Player Upgrade)  
**Source**: Phase 15, 18.3, 21.1, 21.2, 21.3 Micro-Docs, Phase 22.6 Micro-Doc
