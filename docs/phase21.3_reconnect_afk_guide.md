# Phase 21.3: Reconnection & AFK - QA Handoff

## Overview
This document describes the resilience mechanisms for handling network disconnections, AFK (Away From Keyboard) players, and abandoned room cleanup.

---

## 1. ReconnectService

### Purpose
Handle graceful disconnect/reconnect without losing game state.

### Structure

#### `handleDisconnect(roomId, userId)`
**Trigger**: Socket disconnection event  
**Action**:
- Set `players[userId].online = false` in Redis
- Do NOT remove player from room
- Retention window: 5 minutes (implicit via room cleanup)

**Redis Update**:
```typescript
room:{roomId}:players -> HSET userId
{
  "userId": "...",
  "online": false,  // Changed
  "lastActive": 1234567890
}
```

#### `handleReconnect(roomId, userId)`
**Trigger**: Socket join_room event (with existing userId in room)  
**Action**:
- Verify player exists in room
- Set `players[userId].online = true`
- Update `lastActive` timestamp
- Return `isPlaying` (true if game in progress)

**Flow**:
```
Client Reconnect → join_room event → ReconnectService.handleReconnect()
                                   → GameGateway broadcasts sync_state
                                   → Client receives full game snapshot
```

---

## 2. AFKService

### Purpose
Detect and remove inactive players.

### Configuration
- **AFK Warning**: 30 seconds inactivity
- **Auto Kick**: 90 seconds inactivity
- **Dev/Test**: Configurable (currently 30s/90s)

### Cron Job (Every 10 seconds)
```
For each room:
  For each player (online only):
    inactiveTime = now - lastActive
    
    if inactiveTime > 90s:
      kickPlayer(roomId, 'system', userId)
      emit('player_kicked', { targetId, reason: 'AFK' })
      emit('player_list_update', [...])
    
    else if inactiveTime > 30s:
      emit('player_afk', { userId })
```

### Activity Tracking
**Updated on**:
- Every `client_action` event (PLAY, PASS, etc.)
- Calls `afkService.updateActivity(roomId, userId)`
- Updates `lastActive = Date.now()` in Redis

---

## 3. RoomCleanerService

### Purpose
Remove abandoned rooms to free Redis resources.

### Cron Job (Every 1 minute)
```
For each room:
  players = getPlayers(roomId)
  
  if players.length === 0:
    destroyRoom(roomId)
    continue
  
  allOffline = players.every(p => !p.online)
  if allOffline:
    allAbandoned = players.every(p => lastActive < now - 10 mins)
    if allAbandoned:
      destroyRoom(roomId)
```

### Cleanup Conditions
1. **Immediate**: Empty room (0 players)
2. **Delayed**: All players offline for > 10 minutes

---

## 4. WebSocket Events

### New Events (Server → Client)

#### `player_afk`
```json
{
  "userId": "user-123"
}
```
**Trigger**: Player inactive for > 30s  
**Action**: Frontend shows "AFK" badge

#### `player_kicked` (Enhanced)
```json
{
  "targetId": "user-123",
  "reason": "AFK"
}
```
**Trigger**: Player inactive for > 90s  
**Action**: Frontend removes player from UI

---

## 5. Verification Steps

### Test Case 1: Disconnect and Reconnect
**Steps**:
1. Player A joins room, game starts
2. Player A plays a card
3. Player A disconnects (close tab / kill wifi)
4. Wait 30 seconds
5. Player A reconnects (same JWT token)

**Expected**:
- Step 3: `online = false` in Redis, player remains in room
- Step 4: No kick (< 90s)
- Step 5: Receives `sync_state` with full game snapshot (hand, turn, lastMove)

**Verification**:
```bash
# During disconnect
redis-cli HGET room:test-1:players user-A
# Should show "online": false

# After reconnect
# Check logs for "handleReconnect"
# Check client receives sync_state event
```

---

### Test Case 2: AFK Detection
**Steps**:
1. Player A joins room
2. Player A does NOT send any actions
3. Wait 35 seconds
4. Wait 95 seconds

**Expected**:
- 35s: Client receives `player_afk` event
- 95s: Client receives `player_kicked` event with reason "AFK"

**Verification**:
```bash
# Monitor WebSocket events
# Check Redis: player should be removed after 95s
redis-cli HGET room:test-1:players user-A
# Should return (nil)
```

---

### Test Case 3: Abandoned Room Cleanup
**Steps**:
1. Create room, all players disconnect
2. Wait 11 minutes

**Expected**:
- Room destroyed (Redis keys deleted)
- GameContext removed from GameManager

**Verification**:
```bash
# Check Redis
redis-cli EXISTS room:test-1:meta
# Should return 0

# Check logs for "Room test-1 destroyed"
```

---

## 6. Time Sequence Diagram: Reconnection Flow

```
Player          GameGateway       ReconnectService      GameContext      Redis
  |                  |                    |                   |            |
  |-- disconnect --->|                    |                   |            |
  |                  |-- handleDisconnect ->                   |            |
  |                  |                    |-- setOnline(false) ----------->|
  |                  |                    |                   |            |
 [30s wait]          |                    |                   |            |
  |                  |                    |                   |            |
  |-- join_room ---->|                    |                   |            |
  |                  |-- handleReconnect ->|                   |            |
  |                  |                    |-- setOnline(true) ------------>|
  |                  |                    |<-- return isPlaying -----------|
  |                  |                    |                   |            |
  |                  |-- loadSnapshot ----------------------->|            |
  |                  |                    |                   |-- HGETALL ->
  |                  |                    |                   |<-- roomData-|
  |                  |<-- currentState ---|                   |            |
  |                  |                    |                   |            |
  |<-- sync_state ---|                    |                   |            |
  |   (full snapshot)|                    |                   |            |
```

---

## 7. Data Contract

### RoomPlayer (Redis: `room:{id}:players`)
```typescript
{
  userId: string;
  seat: number;
  nickname: string;
  avatar: string;
  online: boolean;      // Updated by ReconnectService
  ready: boolean;
  lastActive: number;   // Updated by AFKService (Unix timestamp)
}
```

### Key Fields for Resilience
- **online**: Tracks connection status (false = disconnected but retained)
- **lastActive**: Timestamp for AFK detection

---

## 8. Edge Cases

### Case 1: Reconnect During Different Game Phase
**Scenario**: Player disconnects in "Playing", reconnects in "RoundEnd"  
**Handling**: `sync_state` includes `currentState` field, client renders correct UI

### Case 2: Multiple Disconnects
**Scenario**: Player disconnects 3 times in 5 minutes  
**Handling**: Each reconnect resets `online = true`, `lastActive` updated

### Case 3: Owner Disconnects
**Scenario**: Room owner disconnects  
**Handling**:
- Owner remains in room (online = false)
- If kicked by AFK, ownership transfers to next player (existing logic)

---

## 9. Configuration

### Environment Variables (Future)
```env
AFK_WARNING_SECONDS=30
AFK_KICK_SECONDS=90
ROOM_CLEANUP_MINUTES=10
```

### Current Hardcoded Values
- AFK Warning: 30s
- AFK Kick: 90s
- Room Cleanup: 10 mins
- Check Interval: 10s (AFK), 1 min (Cleanup)

---

**Status**: ✅ Phase 21.3 Implementation Complete
