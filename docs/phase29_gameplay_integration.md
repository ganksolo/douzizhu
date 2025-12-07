# Phase 29: Gameplay Backend Integration

## 1. Goal
Bridge the architectural gap between `GameGateway` (Socket.IO) and `RoomService` (Redis) to ensure that player actions in the lobby (Join, Ready, Add Bot) clearly reflect in both the persistent Redis state and the real-time Socket room state.

## 2. Key Features

### 2.1 Socket-Redis Synchronization
- **Logic**: When a player joins via Socket (`join_room`), the gateway now calls `RoomService.joinRoom`.
- **Result**: 
  - Validates seat availability in Redis.
  - Assigns a stable seat index (0-3).
  - Emits `player_list_update` to the room with full seat data.

### 2.2 Ready State Management
- **Event**: `toggle_ready`
- **Flow**:
  1. Update `ready` status in Redis via `RoomService`.
  2. Broadcast `player_list_update`.
  3. Check `tryStartGame`: If all players ready + room full -> Emit `game_start`.

### 2.3 Bot Integration
- **API**: `POST /rooms/:id/ai`
- **Flow**:
  1. `RoomService` creates bot in Redis.
  2. `RoomController` invokes `GameGateway` to broadcast `player_list_update`.
  3. Checks `tryStartGame` -> Emits `game_start` if conditions met.

## 3. Technical Implementation

### 3.1 Circular Dependency
- **Modules**: `GameModule` and `RoomModule` import each other.
- **Solution**: Used `forwardRef(() => RoomService)` in `GameGateway` injection.

### 3.2 Key Events
- `player_list_update`: Sent whenever a player joins, leaves, or toggles ready. Payload: `{ roomId, players: RoomPlayer[] }`.
- `game_start`: Sent when the game loop is initialized. Payload: `{ roomId }`.

## 4. Verification
### Automated Test Script (`scripts/verify_phase29.ts`)
1. **Join Flow**: Register -> Connect Socket -> Join -> Verify `player_list_update` contains user.
2. **Ready Flow**: Toddle Ready -> Verify `player_list_update` shows `ready: true`.
3. **Bot Flow**: Add 3 Bots via REST API -> Verify `player_list_update` x3 -> Verify `game_start` event.

### Status
- **Date**: 2025-12-07
- **Result**: ✅ Verified
