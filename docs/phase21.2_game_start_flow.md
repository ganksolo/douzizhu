# Phase 21.2: Game Start & Ready System (Handoff Micro-Doc)

## 1. Feature Definition
**Module**: `RoomModule`
**Responsibility**: Handles player ready state, automatic game start trigger, and rematch logic.

## 2. Logic Flow

### Ready Toggle
1. User sends `toggle_ready`.
2. Server updates `room:{id}:players` (JSON `ready` field).
3. Server broadcasts `player_list_update`.
4. Server checks `tryStartGame`.

### Game Start Trigger
**Condition**:
- Room has 3 players.
- All players `ready === true`.

**Action**:
1. Update `room:{id}:meta` status -> `playing`.
2. Initialize `GameContext` (State Machine).
3. Broadcast `game_start`.

### Rematch
1. User sends `request_rematch`.
2. Server resets `room:{id}:meta` status -> `waiting`.
3. Server resets ALL players `ready` -> `false`.
4. Broadcast `room_reset` and `player_list_update`.

## 3. I/O Contract (WebSocket)

### Namespace: `/room`

#### Client -> Server

**Toggle Ready**
```json
{ "type": "toggle_ready", "roomId": "1001", "isReady": true }
```

**Request Rematch**
```json
{ "type": "request_rematch", "roomId": "1001" }
```

#### Server -> Client

**Game Start**
```json
{ "type": "game_start", "roomId": "1001" }
```

**Room Reset**
```json
{ "type": "room_reset", "roomId": "1001" }
```

## 4. Verification Steps (Executable)

### Step 1: Verify Ready State
*Action*: User A sends `toggle_ready` (true).
```bash
redis-cli HGET room:1001:players <UserA_ID>
# Expected: JSON contains "ready": true
```

### Step 2: Verify Game Start
*Pre-condition*: 3 Players in room.
*Action*: All 3 players set Ready.
```bash
redis-cli HGET room:1001:meta status
# Expected: "playing"
```

### Step 3: Verify Rematch Reset
*Action*: Any player sends `request_rematch`.
```bash
redis-cli HGET room:1001:meta status
# Expected: "waiting"

redis-cli HGETALL room:1001:players
# Expected: All players JSON contains "ready": false
```
