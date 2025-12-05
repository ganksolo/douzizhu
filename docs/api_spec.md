# Dou Dizhu Backend API Specification

## Overview

This document defines the RESTful API and WebSocket protocol required for the Dou Dizhu multiplayer backend. The backend should support:

- User authentication and authorization
- Room/game session management
- Real-time multiplayer gameplay via WebSocket
- Score tracking and leaderboards
- Match history

---

## Base URL

```
Production: https://api.doudizhu.example.com
Development: http://localhost:3001/api
```

---

## Authentication

All authenticated endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## REST API Endpoints

### 1. Authentication

#### `POST /auth/register`
**Description**: Register a new user account

**Request Body**:
```json
{
  "username": "string (3-20 chars, required)",
  "password": "string (6+ chars, required)",
  "email": "string (optional)"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "username": "string",
    "token": "jwt_token",
    "expiresAt": "iso8601_timestamp"
  }
}
```

**Errors**:
- 400: Invalid input (username taken, weak password)
- 500: Server error

---

#### `POST /auth/login`
**Description**: Login with existing credentials

**Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "username": "string",
    "token": "jwt_token",
    "expiresAt": "iso8601_timestamp"
  }
}
```

**Errors**:
- 401: Invalid credentials
- 500: Server error

---

#### `POST /auth/refresh`
**Description**: Refresh JWT token

**Headers**:
```
Authorization: Bearer <REFRESH_TOKEN>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "expiresAt": "iso8601_timestamp"
  }
}
```

---

### 2. User Profile

#### `GET /users/me`
**Description**: Get current user profile

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "username": "string",
    "email": "string",
    "stats": {
      "totalGames": 123,
      "wins": 45,
      "losses": 78,
      "winRate": 0.366,
      "totalScore": 1250
    },
    "createdAt": "iso8601_timestamp"
  }
}
```

---

#### `PATCH /users/me`
**Description**: Update user profile

**Headers**: Requires authentication

**Request Body**:
```json
{
  "email": "string (optional)",
  "password": "string (optional)"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "username": "string",
    "email": "string"
  }
}
```

---

### 3. Game Rooms

#### `POST /rooms`
**Description**: Create a new game room

**Headers**: Requires authentication

**Request Body**:
```json
{
  "name": "string (optional)",
  "maxPlayers": 4,
  "type": "string (optional, enum: 'PVP' | 'PVE', default: 'PVP')",
  "difficulty": "string (optional, enum: 'EASY' | 'MEDIUM' | 'HARD', default: 'MEDIUM')",
  "botCount": "number (optional, default: 0)",
  "isPrivate": false,
  "password": "string (optional, for private rooms)"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "roomId": "uuid",
    "name": "string",
    "hostId": "uuid",
    "maxPlayers": 4,
    "currentPlayers": 1,
    "type": "PVP",
    "difficulty": "MEDIUM",
    "botCount": 0,
    "isPrivate": false,
    "status": "waiting",
    "createdAt": "iso8601_timestamp"
  }
}
```

---

#### `GET /rooms`
**Description**: List available game rooms

**Headers**: Requires authentication

**Query Parameters**:
```
?status=waiting      (optional: waiting, playing, finished)
?page=1             (default: 1)
&limit=20           (default: 20, max: 100)
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "roomId": "uuid",
        "name": "string",
        "hostId": "uuid",
        "currentPlayers": 2,
        "maxPlayers": 4,
        "isPrivate": false,
        "status": "waiting"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

#### `GET /rooms/:roomId`
**Description**: Get room details

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "roomId": "uuid",
    "name": "string",
    "hostId": "uuid",
    "players": [
      {
        "userId": "uuid",
        "username": "string",
        "isReady": true
      }
    ],
    "maxPlayers": 4,
    "isPrivate": false,
    "status": "waiting",
    "createdAt": "iso8601_timestamp"
  }
}
```

**Errors**:
- 404: Room not found

---

#### `POST /rooms/:roomId/join`
**Description**: Join an existing room

**Headers**: Requires authentication

**Request Body** (for private rooms):
```json
{
  "password": "string (optional)"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "roomId": "uuid",
    "playerId": "uuid"
  }
}
```

**Errors**:
- 403: Room is full or wrong password
- 404: Room not found

---

#### `POST /rooms/:roomId/leave`
**Description**: Leave current room

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Left room successfully"
}
```

---

#### `DELETE /rooms/:roomId`
**Description**: Delete room (host only)

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Room deleted"
}
```

**Errors**:
- 403: Not room host

---

### 4. Game Sessions

#### `POST /games/:roomId/start`
**Description**: Start game in room (host only)

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "gameId": "uuid",
    "roomId": "uuid",
    "status": "playing"
  }
}
```

**Errors**:
- 400: Not enough players
- 403: Not host

---

#### `GET /games/:gameId`
**Description**: Get game state

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "gameId": "uuid",
    "roomId": "uuid",
    "status": "playing",
    "currentTurn": "uuid",
    "players": [
      {
        "userId": "uuid",
        "username": "string",
        "role": "landlord",
        "cardCount": 17,
        "score": 0
      }
    ],
    "lastAction": {
      "playerId": "uuid",
      "type": "play_cards",
      "cards": [...],
      "timestamp": "iso8601"
    }
  }
}
```

---

#### `GET /games/:gameId/history`
**Description**: Get game action history

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "gameId": "uuid",
    "actions": [
      {
        "actionId": "uuid",
        "playerId": "uuid",
        "type": "bid",
        "data": { "bidValue": 2 },
        "timestamp": "iso8601"
      }
    ]
  }
}
```

---

### 5. Leaderboard & Stats

#### `GET /leaderboard`
**Description**: Get global leaderboard

**Query Parameters**:
```
?sortBy=totalScore  (totalScore, winRate, totalGames)
&period=all         (all, daily, weekly, monthly)
&limit=100          (default: 50)
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "userId": "uuid",
        "username": "string",
        "totalScore": 5000,
        "winRate": 0.65,
        "totalGames": 200
      }
    ],
    "updatedAt": "iso8601_timestamp"
  }
}
```

---

#### `GET /users/:userId/matches`
**Description**: Get user's match history

**Headers**: Requires authentication

**Query Parameters**:
```
?page=1
&limit=20
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "gameId": "uuid",
        "result": "win",
        "role": "landlord",
        "score": 60,
        "duration": 1200,
        "players": ["user1", "user2", "user3", "user4"],
        "playedAt": "iso8601_timestamp"
      }
    ],
    "pagination": {
      "page": 1,
      "total": 123
    }
  }
}
```

---

## 4. Match History API

### 4.1 Get Player History
Retrieves recent match history for a specific player.

- **URL**: `/matches/player/:playerId`
- **Method**: `GET`
- **Query Params**:
  - `limit` (optional): Number of records (default 20, max 50)
- **Response**: `MatchRecord[]`

### 4.2 Get Match Detail
Retrieves full details of a specific match, including replay actions.

- **URL**: `/matches/:id`
- **Method**: `GET`
- **Response**: `MatchRecord`

---

## 5. WebSocket Events

**Base URL**: `http://localhost:3001`
**WebSocket URL**: `ws://localhost:3001`

### Connection

**Authentication**: Send JWT token on connection:
```json
{
  "type": "auth",
  "token": "jwt_token"
}
```

**Response**:
```json
{
  "type": "auth_success",
  "userId": "uuid"
}
```

---

### Events (Client → Server)

#### 1. Join Room
```json
{
  "type": "join_room",
  "roomId": "uuid"
}
```

#### 2. Leave Room
```json
{
  "type": "leave_room",
  "roomId": "uuid"
}
```

#### 3. Ready/Unready
```json
{
  "type": "toggle_ready",
  "roomId": "uuid"
}
```

#### 4. Bid
```json
{
  "type": "bid",
  "gameId": "uuid",
  "bidValue": 2
}
```

#### 5. Play Cards
```json
{
  "type": "play_cards",
  "gameId": "uuid",
  "cards": [
    { "rank": "3", "suit": "spades" }
  ]
}
```

#### 6. Pass Turn
```json
{
  "type": "pass",
  "gameId": "uuid"
}
```
#### 6. Pass Turn
```json
{
  "type": "pass",
  "gameId": "uuid"
}
```

#### 7. Kick Player (Host Only)
```json
{
  "type": "kick_player",
  "roomId": "uuid",
  "targetId": "uuid"
}
```

#### 8. Toggle Ready
```json
{
  "type": "toggle_ready",
  "roomId": "uuid",
  "isReady": true
}
```

#### 9. Request Rematch
```json
{
  "type": "request_rematch",
  "roomId": "uuid"
}
```

---

### Events (Server → Client)

#### 0. Sync State (Primary State Update)
```json
{
  "type": "sync_state",
  "phase": "PLAYING",
  "players": [...],
  "currentTurn": 2,
  "bottomCards": [1, 2, 3],
  "lastPlayed": { "seatIndex": 1, "cards": [...] }
}
```
**Description**: Full state snapshot sent on every change. Frontend uses this to hydrate `GameStore`.

#### 1. Room Updated (Player List)
```json
{
  "type": "player_list_update",
  "roomId": "uuid",
  "players": [
    {
      "userId": "uuid",
      "username": "string",
      "avatar": "string",
      "seat": 0,
      "online": true,
      "isReady": false
    }
  ]
}
```

#### 2. Player Events
**Player Joined**:
```json
{
  "type": "player_joined",
  "userId": "uuid",
  "username": "string"
}
```

**Player Left**:
```json
{
  "type": "player_left",
  "userId": "uuid"
}
```

#### 3. Player Kicked
```json
{
  "type": "player_kicked",
  "targetId": "uuid"
}
```

#### 4. Game Start
```json
{
  "type": "game_start",
  "roomId": "uuid"
}
```

#### 5. Room Reset
```json
{
  "type": "room_reset",
  "roomId": "uuid"
}
```

#### 6. Player AFK
```json
{
  "type": "player_afk",
  "userId": "uuid"
}
```
**Description**: Sent when a player has been inactive for > 30 seconds. Frontend should display "AFK" indicator.



#### 2. Game Started
```json
{
  "type": "game_started",
  "gameId": "uuid",
  "players": [...],
  "yourHand": [...]
}
```

#### 3. Cards Dealt
```json
{
  "type": "cards_dealt",
  "gameId": "uuid",
  "yourHand": [...]
}
```

#### 4. Turn Changed
```json
{
  "type": "turn_changed",
  "gameId": "uuid",
  "currentTurn": "uuid",
  "playerName": "string"
}
```

#### 5. Player Action
```json
{
  "type": "player_action",
  "gameId": "uuid",
  "playerId": "uuid",
  "action": "play_cards",
  "cards": [...],
  "timestamp": "iso8601"
}
```

#### 6. Game Over
```json
{
  "type": "game_over",
  "gameId": "uuid",
  "winnerId": "uuid",
  "scores": {
    "player1": 60,
    "player2": -20,
    "player3": -20,
    "player4": -20
  }
}
```

#### 7. Error
```json
{
  "type": "error",
  "code": "INVALID_MOVE",
  "message": "Cannot play these cards"
}
```

---

## Data Models

### User
```typescript
{
  userId: string (UUID)
  username: string
  email: string
  passwordHash: string
  stats: {
    totalGames: number
    wins: number
    losses: number
    totalScore: number
  }
  createdAt: Date
  updatedAt: Date
}
```

### Room
```typescript
{
  roomId: string (UUID)
  name: string
  hostId: string (UUID)
  players: string[] (UUIDs)
  maxPlayers: number
  isPrivate: boolean
  passwordHash: string?
  status: 'waiting' | 'playing' | 'finished'
  createdAt: Date
}
```

### Game
```typescript
{
  gameId: string (UUID)
  roomId: string (UUID)
  players: {
    userId: string
    role: 'landlord' | 'peasant'
    hand: Card[]
    score: number
  }[]
  currentTurn: string (userId)
  gameState: {
    phase: 'bidding' | 'playing' | 'finished'
    lastPlayedCards: Card[]?
    bids: Record<userId, number>
  }
  winnerId: string?
  startedAt: Date
  finishedAt: Date?
}
```

### Match History
```typescript
{
  matchId: string (UUID)
  gameId: string (UUID)
  userId: string (UUID)
  result: 'win' | 'loss'
  role: 'landlord' | 'peasant'
  score: number
  duration: number (seconds)
  playedAt: Date
}
```

---

## Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Error Codes

- `INVALID_INPUT` - Request validation failed
- `UNAUTHORIZED` - Missing or invalid token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `ROOM_FULL` - Room has reached max players
- `INVALID_MOVE` - Game rule violation
- `SERVER_ERROR` - Internal server error

---

## Rate Limiting

- Authentication endpoints: 5 requests/minute
- General API: 100 requests/minute
- WebSocket: 30 messages/second

---

## Implementation Notes

1. **Authentication**: Use JWT with 24-hour expiration
2. **Database**: Recommended PostgreSQL or MongoDB
3. **WebSocket**: Use Socket.io or native WebSocket
4. **Card Validation**: Reuse frontend rules from `src/rules/`
5. **Game State**: Store in Redis for real-time performance
6. **Persistence**: Save completed games to database

---

## Security Considerations

- Validate all card plays server-side (never trust client)
- Rate limit API and WebSocket connections
- Hash passwords with bcrypt (cost factor 10+)
- Sanitize all user inputs
- Use HTTPS in production
- Implement CORS properly

---

**Version**: 1.0  
**Last Updated**: 2025-11-28  
**Status**: Draft - Ready for Backend Development
