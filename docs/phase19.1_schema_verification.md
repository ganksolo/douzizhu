# Phase 19.1: Match Persistence - Database Schema Verification Checklist

## 📋 Table Structure

### Table: `match_record`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT | Unique match identifier |
| `roomId` | VARCHAR(255) | NOT NULL, INDEX | Room where match was played |
| `winnerPlayerId` | VARCHAR(255) | NOT NULL, INDEX | Player who won |
| `landlordPlayerId` | VARCHAR(255) | NOT NULL, INDEX | Player who was landlord |
| `playersJson` | JSON | NOT NULL | All players' final state |
| `resultJson` | JSON | NOT NULL | Complete match result with replay data |
| `startTime` | DATETIME | NOT NULL, INDEX | Match start timestamp |
| `endTime` | DATETIME | NOT NULL | Match end timestamp |
| `duration` | INT | NULLABLE | Match duration in seconds (computed) |
| `createdAt` | DATETIME | AUTO_GENERATED | Record creation timestamp |

---

## 🔍 JSON Schema验证

### 1. `playersJson` Field Structure

**Expected Data Type**: `PlayerSnapshot[]` (Array of 4 objects for 4-player game)

**Sample Data**:
```json
[
  {
    "userId": "user-abc-123",
    "username": "Player1",
    "role": "landlord",
    "finalHand": ["♠3", "♥4", "♦5"],
    "score": 120,
    "handCount": 3
  },
  {
    "userId": "user-def-456",
    "username": "Player2",
    "role": "peasant",
    "finalHand": [],
    "score": -40,
    "handCount": 0
  },
  {
    "userId": "user-ghi-789",
    "username": "Player3",
    "role": "peasant",
    "finalHand": ["♣2", "joker-small"],
    "score": -40,
    "handCount": 2
  },
  {
    "userId": "user-jkl-012",
    "username": "Player4",
    "role": "peasant",
    "finalHand": [],
    "score": -40,
    "handCount": 0
  }
]
```

**Field Validation**:
- ✅ `userId`: String (UUID or custom ID)
- ✅ `username`: String (max 50 chars recommended)
- ✅ `role`: Enum `"landlord" | "peasant"`
- ✅ `finalHand`: Array of card strings (e.g., "♠3", "joker-big")
- ✅ `score`: Integer (positive for winner, negative for losers)
- ✅ `handCount`: Integer (0-25 for 4-player)

**Storage Size Estimate**:
- Per player: ~150-250 bytes (depending on hand size)
- 4 players: ~600-1000 bytes (~1KB)

---

### 2. `resultJson` Field Structure

**Expected Data Type**: `MatchResultData` (Single object)

**Sample Data**:
```json
{
  "players": [
    {
      "userId": "user-abc-123",
      "username": "Player1",
      "role": "landlord",
      "finalHand": ["♠3", "♥4", "♦5"],
      "score": 120,
      "handCount": 3
    }
  ],
  "actions": [
    {
      "timestamp": 1701234567890,
      "playerId": "user-abc-123",
      "actionType": "BID",
      "bidValue": 3
    },
    {
      "timestamp": 1701234568000,
      "playerId": "user-def-456",
      "actionType": "PASS"
    },
    {
      "timestamp": 1701234569000,
      "playerId": "user-abc-123",
      "actionType": "PLAY",
      "cards": ["♠3", "♥3", "♦3"]
    }
  ],
  "landlordPlayerId": "user-abc-123",
  "winnerPlayerId": "user-def-456",
  "winMethod": "normal",
  "multiplier": 2,
  "duration": 480
}
```

**Field Validation**:
- ✅ `players`: Same as `playersJson` (duplicate for convenience)
- ✅ `actions`: Array of `ActionRecord` objects   - ✅ `timestamp`: Unix timestamp in milliseconds (13 digits)
  - ✅ `playerId`: String (user ID)
  - ✅ `actionType`: Enum `"PLAY" | "PASS" | "BID"`
  - ✅ `cards`: Optional array of card strings (required for PLAY)
  - ✅ `bidValue`: Optional integer (required for BID, range 0-3)
- ✅ `landlordPlayerId`: String (user ID)
- ✅ `winnerPlayerId`: String (user ID)
- ✅ `winMethod`: Enum `"normal" | "spring" | "anti-spring"`
- ✅ `multiplier`: Integer (1-16, exponential with bombs)
- ✅ `duration`: Integer (seconds, 60-3600 typical range)

**Storage Size Estimate**:
- Base data (players + metadata): ~1KB
- Per action: ~80-150 bytes (depending on card count)
- Typical game (100 actions): ~8-15KB
- Long game (300 actions): ~24-45KB
- **Maximum**: ~64KB (MySQL JSON column limit)

---

## ⚠️ MySQL Version Requirements

### JSON Column Support
- **Minimum Version**: MySQL 5.7.8+ (Native JSON type)
- **Recommended**: MySQL 8.0+ (Better JSON functions)

### JSON Functions Used in Repository
- `JSON_SEARCH()`: Find player in `playersJson` array
  - MySQL 5.7: ✅ Supported
  - MySQL 8.0: ✅ Enhanced performance

### Fallback for Older MySQL
If MySQL < 5.7, change column types:
```typescript
@Column({ type: 'text' }) // Use TEXT instead of JSON
playersJson: string; // Store as JSON string

// Manual serialization/deserialization required
```

---

## 📊 Index Strategy

### Primary Index
- `id` (PRIMARY KEY): Auto-indexed

### Secondary Indexes
1. `roomId`: Query all matches in a room
2. `winnerPlayerId`: Query player's wins
3. `landlordPlayerId`: Query landlord history
4. `startTime`: Sort/filter by date

### Query Performance Estimates
- **By ID**: O(1) - ~1ms
- **By roomId/winner/landlord**: O(log n) - ~5-10ms (with index)
- **By playerId (JSON search)**: O(n) - ~50-100ms (full table scan on JSON)
  - Optimization: Add `player_match` junction table for frequent queries

---

## 🧪 Data Validation Tests

### Test 1: Basic Insert & Retrieve
```sql
INSERT INTO match_record (
  roomId, winnerPlayerId, landlordPlayerId, 
  playersJson, resultJson, startTime, endTime, duration
) VALUES (
  'room-123',
  'user-abc-123',
  'user-abc-123',
  '[{"userId":"user-abc-123","username":"Player1",...}]',
  '{"players":[...],"actions":[...],...}',
  '2025-11-30 10:00:00',
  '2025-11-30 10:08:00',
  480
);

SELECT * FROM match_record WHERE id = LAST_INSERT_ID();
```

**Expected Result**: ✅ Row inserted successfully, JSON parsed correctly

### Test 2: JSON Query (Find by Player)
```sql
SELECT * FROM match_record
WHERE JSON_SEARCH(playersJson, 'one', 'user-abc-123', NULL, '$[*].userId') IS NOT NULL
LIMIT 10;
```

**Expected Result**: ✅ Returns all matches where `user-abc-123` participated

### Test 3: Date Range Query
```sql
SELECT * FROM match_record
WHERE startTime >= '2025-11-01' AND startTime <= '2025-11-30'
ORDER BY startTime DESC;
```

**Expected Result**: ✅ Returns matches within November 2025

### Test 4: JSON Field Validation
```sql
SELECT 
  id,
  JSON_LENGTH(playersJson) AS player_count,
  JSON_LENGTH(resultJson, '$.actions') AS action_count
FROM match_record
LIMIT 10;
```

**Expected Result**: ✅ `player_count` = 4, `action_count` > 0

---

## 🚨 Potential Issues & Solutions

### Issue 1: JSON Size Exceeds 64KB
- **Symptom**: `Data too long for column 'resultJson'`
- **Solution**: 
  - Store `actions` in separate table if needed
  - Or use `MEDIUMTEXT` instead of `JSON`

### Issue 2: JSON_SEARCH Not Working
- **Symptom**: Query returns empty even with valid data
- **Solution**: Verify MySQL version ≥ 5.7.8

### Issue 3: Slow Player Queries
- **Symptom**: `findByPlayerId()` takes >100ms
- **Solution**: 
  - Create `player_match` junction table
  - Or use MySQL 8.0 generated column + index

---

## ✅ Schema Readiness Checklist

- [x] Table structure defined with proper data types
- [x] JSON columns use native `JSON` type (MySQL 5.7+)
- [x] Indexes created for common query patterns
- [x] Sample data structures documented
- [x] Storage size estimates calculated
- [x] MySQL version requirements specified
- [x] Query performance considerations noted
- [ ] **Pending**: Create table via migration (TypeORM `synchronize: true` or manual migration)
- [ ] **Pending**: Test INSERT/SELECT queries
- [ ] **Pending**: Verify JSON_SEARCH performance

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-30  
**Status**: ✅ Ready for Database Creation
