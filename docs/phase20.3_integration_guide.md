# Phase 20.3: System Integration Guide

## 🔌 Socket Authentication

### Connection Flow
1. **Client**: Connects to `ws://localhost:3000/game`
2. **Auth**: Must provide `token` in query parameters or auth handshake object.
   - Example: `io('http://localhost:3000/game', { auth: { token: 'jwt_token_here' } })`
3. **Server**:
   - Verifies token via `AuthService`.
   - If valid: Connection accepted, `client.data.userId` set.
   - If invalid: Connection rejected (Disconnect).

### Failure Scenarios
- **Missing Token**: Server logs warning and disconnects immediately.
- **Invalid/Expired Token**: Server logs warning and disconnects immediately.
- **Client Behavior**: Should listen for `disconnect` event.

---

## 📊 User Statistics API

### Get User Stats
**Endpoint**: `GET /user/:id/stats`
**Auth**: Required (Bearer Token)

**Response (200 OK)**:
```json
{
  "user": {
    "id": "1",
    "nickname": "Guest-1234",
    "avatar": "..."
  },
  "stats": {
    "totalMatches": 15,
    "totalWins": 5,
    "winRate": 0.3333
  },
  "recentMatches": [
    { "id": "101", "winnerPlayerId": "1", "score": 100, ... },
    { "id": "99", "winnerPlayerId": "2", "score": -50, ... }
  ]
}
```

---

## 🧪 Integration Test Steps

1. **Login**: `POST /auth/guest-login` -> Get `access_token` & `user.id`.
2. **Connect Socket**: Use `access_token` to connect to Game Gateway.
   - Verify server logs: `Client authenticated as ...`
3. **Play Game**: (Optional) Complete a match to generate history.
4. **Check Stats**: `GET /user/{user.id}/stats` -> Verify `totalMatches` increases.
