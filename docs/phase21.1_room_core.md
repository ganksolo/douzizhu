# Phase 21.1: Room Core Management (Handoff Micro-Doc)

## 1. Feature Definition
**Module**: `RoomModule`
**Responsibility**: Manages room lifecycle (Create, Join, Leave, Destroy) and persistent state using Redis.

## 2. Data Structure (Redis)

### Room Meta
**Key**: `room:{roomId}:meta`
**Type**: Hash
**TTL**: 24 Hours
| Field | Type | Description |
|---|---|---|
| `ownerId` | String (UUID) | User ID of the room owner |
| `status` | String | `waiting` \| `playing` |
| `config` | JSON String | Game configuration (e.g., `{ baseScore: 1 }`) |

### Room Players
**Key**: `room:{roomId}:players`
**Type**: Hash
**TTL**: 24 Hours
**Field**: `userId` (String)
**Value**: JSON String
```json
{
  "userId": "uuid",
  "seat": 0, // 0-2
  "nickname": "Player1",
  "avatar": "url",
  "online": true,
  "ready": false,
  "lastActive": 1701234567890
}
```

## 3. I/O Contract (WebSocket)

### Namespace: `/room`

#### Client -> Server

**Join Room**
```json
{ "type": "join_room", "roomId": "1001" }
```

**Leave Room**
```json
{ "type": "leave_room", "roomId": "1001" }
```

**Kick Player**
```json
{ "type": "kick_player", "roomId": "1001", "targetId": "uuid" }
```

#### Server -> Client

**Player List Update**
```json
{
  "type": "player_list_update",
  "roomId": "1001",
  "players": [ ... ] // Array of RoomPlayer objects
}
```

**Player Joined/Left/Kicked**
```json
{ "type": "player_joined", "userId": "uuid", "nickname": "name" }
{ "type": "player_left", "userId": "uuid" }
{ "type": "player_kicked", "targetId": "uuid" }
```

## 4. Verification Steps (Executable)

### Step 1: Verify Redis Keys
*Pre-condition*: User A joins room `1001`.
```bash
# Check Meta
redis-cli HGETALL room:1001:meta
# Expected: ownerId = UserA, status = waiting

# Check Player
redis-cli HGET room:1001:players <UserA_ID>
# Expected: JSON with seat=0
```

### Step 2: Verify Seat Assignment
*Action*: User B and User C join.
```bash
redis-cli HLEN room:1001:players
# Expected: 3
```

### Step 3: Verify Owner Transfer
*Action*: User A (Owner) leaves.
```bash
redis-cli HGET room:1001:meta ownerId
# Expected: User B or User C ID
```
