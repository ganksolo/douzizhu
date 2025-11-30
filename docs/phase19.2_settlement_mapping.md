# Phase 19.2: Match Settlement - Data Mapping & Verification

## 🔄 Data Transformation: Redis (Hot) -> MySQL (Cold)

This document maps the in-memory `RoomData` (Redis) to the persistent `MatchRecord` (MySQL).

### 1. Player Data Mapping (`playersJson`)

| Redis Field (`RoomData.players[i]`) | MySQL Field (`match_record.playersJson[i]`) | Transformation Logic |
|-------------------------------------|---------------------------------------------|----------------------|
| `id` | `userId` | Direct mapping |
| `name` | `username` | Direct mapping |
| `role` | `role` | Direct mapping ('landlord' \| 'peasant') |
| `hand` | `finalHand` | Direct mapping (Array of card strings) |
| `hand.length` | `handCount` | Calculated length of hand array |
| *Calculated* | `score` | **Logic**: <br>If Landlord wins: +100 * multiplier<br>If Landlord loses: -100 * multiplier<br>Peasants get opposite/3 |

### 2. Match Result Mapping (`resultJson`)

| Redis Field (`RoomData`) | MySQL Field (`match_record.resultJson`) | Transformation Logic |
|--------------------------|-----------------------------------------|----------------------|
| `actionHistory` | `actions` | **Source**: `ActionPipelineService` tracks all valid actions.<br>**Fields**: timestamp, playerId, actionType, cards |
| `landlordId` | `landlordPlayerId` | Direct mapping |
| *Calculated* | `winnerPlayerId` | Player with 0 cards in hand |
| `multiplier` | `multiplier` | Direct mapping (default 1) |
| *Calculated* | `winMethod` | **Logic**: <br>`spring`: Landlord wins, peasants played 0 cards<br>`anti-spring`: Peasants win, landlord played 1 hand only<br>`normal`: Otherwise |
| `endTime - startTime` | `duration` | Seconds between match start and end |

### 3. Root Level Fields

| Redis Field | MySQL Column | Notes |
|-------------|--------------|-------|
| `roomId` | `roomId` | Indexed for room history lookup |
| *Calculated* | `winnerPlayerId` | Indexed for player win stats |
| *Calculated* | `landlordPlayerId` | Indexed for role stats |
| `startTime` | `startTime` | Set in `DealingState.enter()` |
| `new Date()` | `endTime` | Set in `MatchService.saveMatchResult()` |

---

## 🧪 Verification Checklist

### 1. Action History Tracking
- [ ] **Scenario**: Play a full game.
- [ ] **Check**: Redis `roomData.actionHistory` should contain sequence of JOIN, READY, PLAY, PASS actions.
- [ ] **Verify**: `match_record.resultJson.actions` matches the sequence.

### 2. Score Calculation
- [ ] **Scenario**: Landlord wins with multiplier x2.
- [ ] **Check**: Landlord score = +200, Peasants score = -66 (approx).
- [ ] **Scenario**: Landlord loses with multiplier x1.
- [ ] **Check**: Landlord score = -100, Peasants score = +33.

### 3. Win Method Detection
- [ ] **Scenario**: Landlord plays all cards, peasants play none.
- [ ] **Check**: `winMethod` should be `spring`.
- [ ] **Scenario**: Landlord plays one hand, peasants win.
- [ ] **Check**: `winMethod` should be `anti-spring`.

### 4. Async Persistence
- [ ] **Scenario**: Game ends.
- [ ] **Check**: Server logs "Match saved: roomId=...".
- [ ] **Check**: Game loop continues without stutter (save is async).
- [ ] **Check**: Database contains new record with correct timestamp.

---

## ⚠️ Known Limitations
- **Bidding Phase**: Currently simplified. Bidding actions might not be fully tracked if they don't go through the main pipeline yet (depending on implementation).
- **Disconnects**: If a player disconnects, `actionHistory` might show gaps or auto-play actions (if AI takes over).
