# GitHub Issue #18: Fill All Empty Seats with Bots

## Problem Statement
The "Add AI" button only added one bot per click, requiring users to click multiple times (3 times for a 4-player game) to fill all seats. This created poor UX, especially for PVE games where users just want to quickly start playing against bots.

## Solution Implemented
Added a new REST endpoint `/rooms/:id/fill-bots` that fills **all** empty seats with AI bots in a single request.

### Backend Changes

#### 1. RoomService (`backend/src/room/room.service.ts`)
Added new method `fillBotsToRoom`:
```typescript
async fillBotsToRoom(roomId: string, maxCount?: number): Promise<RoomPlayer[]>
```
- Calculates empty seats in the room
- Adds bots sequentially until all seats are filled (or `maxCount` is reached)
- Returns array of all added bots

#### 2. RoomController (`backend/src/room/room.controller.ts`)
Added new endpoint:
```typescript
POST /rooms/:id/fill-bots
```

**Response**:
```json
{
  "success": true,
  "data": {
    "botsAdded": 3,
    "bots": [...]
  }
}
```

**Socket Events Emitted**:
- `player_list_update`: Full updated player list
- `player_joined`: Individual event for each bot (with `isBot: true`)
- `game_start`: If room becomes full and all ready

#### 3. API Documentation
Updated both API specification files per the project's **API Dual-Write Protocol**:
- `docs/api_spec.md`: Complete endpoint documentation (AI-specific format)
- `docs/openapi.yaml`: OpenAPI 3.1 specification (Developer contract)

## Verification Results
Executed `scripts/verify_issue18_fill_bots.ts`:

**Test Flow**:
1. Create 4-player PVE room
2. Human player joins (1/4 seats)
3. Call `/fill-bots` endpoint
4. Verify 3 bots added in one request
5. Verify all socket events emitted
6. Verify final room state

**Results**: ✅ All checks passed
- API returned `botsAdded: 3`
- Received 3 `player_joined` events with `isBot: true`
- Final room: 4 players (1 human + 3 bots)
- All bots have `isReady: true`

## UX Improvement
**Before**: Click "Add AI" → Wait → Click again → Wait → Click again → Ready → Start  
**After**: Click "Fill AI Players" → Ready → Start

This reduces friction from **5 interactions to 2 interactions** for starting a PVE game.

## Next Steps
Frontend needs to:
1. Add new button "🤖 Fill AI Players" that calls `/rooms/${roomId}/fill-bots`
2. Update existing "Add AI" button logic (or replace it entirely)
3. Optionally show toast: "Added 3 AI players!" with bot count

## Related Issues
- GitHub Issue #18: ✅ Fixed (Backend complete)
- Frontend implementation: Pending
