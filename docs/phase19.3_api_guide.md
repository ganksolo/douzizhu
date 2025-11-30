# Phase 19.3: Match History API Guide

## 📡 API Endpoints

### 1. Get Player History
**Endpoint**: `GET /matches/player/:playerId`
**Query Params**: `limit` (default 20, max 50)
**Description**: Retrieve recent match history for a specific player.

**Request**:
```http
GET /matches/player/user-123?limit=10
```

**Response (200 OK)**:
```json
[
  {
    "id": "1001",
    "roomId": "room-abc",
    "winnerPlayerId": "user-123",
    "landlordPlayerId": "user-123",
    "startTime": "2025-11-30T10:00:00.000Z",
    "endTime": "2025-11-30T10:05:00.000Z",
    "duration": 300,
    "playersJson": [
      {
        "userId": "user-123",
        "username": "MyPlayer",
        "role": "landlord",
        "score": 200,
        "finalHand": [],
        "handCount": 0
      },
      {
        "userId": "user-456",
        "username": "Opponent1",
        "role": "peasant",
        "score": -100,
        "finalHand": ["3", "4"],
        "handCount": 2
      },
      ...
    ],
    "resultJson": {
      "winMethod": "normal",
      "multiplier": 2,
      "actions": [...]
    }
  }
]
```

### 2. Get Match Detail
**Endpoint**: `GET /matches/:id`
**Description**: Retrieve full details of a specific match, including replay actions.

**Request**:
```http
GET /matches/1001
```

**Response (200 OK)**:
```json
{
  "id": "1001",
  "roomId": "room-abc",
  "resultJson": {
    "actions": [
      {
        "timestamp": 1701338400000,
        "playerId": "user-123",
        "actionType": "PLAY",
        "cards": ["3", "4", "5", "6", "7"]
      },
      {
        "timestamp": 1701338405000,
        "playerId": "user-456",
        "actionType": "PASS"
      }
    ],
    "winMethod": "normal",
    "multiplier": 2
  },
  ...
}
```

---

## 🧪 Testing Guide

### Unit Tests
Run the following command to execute unit tests for the persistence layer:
```bash
npm test src/game/match
npm test src/game/services/match.service.spec.ts
```

### Manual API Testing (cURL)

**1. Fetch History**:
```bash
curl http://localhost:3000/matches/player/user-123
```

**2. Fetch Detail**:
```bash
curl http://localhost:3000/matches/1
```

---

## ⚠️ Notes
- `playersJson` and `resultJson` are stored as JSON columns in MySQL.
- `duration` is calculated in seconds.
- `startTime` and `endTime` are ISO 8601 strings.
