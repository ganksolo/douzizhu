# Phase 24: REST API Implementation

## Goal
Implement the missing REST API endpoints for Room Management, enabling frontend clients to list, create, and join rooms via HTTP before establishing WebSocket connections.

## Key Components

### 1. RoomController (`src/room/room.controller.ts`)
- `GET /rooms`: List available rooms with pagination.
- `GET /rooms/:id`: Get room details (metadata + player list).
- `POST /rooms`: Create a new room and auto-join the host.
- `POST /rooms/:id/join`: Join an existing room (supports password).
- `POST /rooms/:id/leave`: Leave a room.

### 2. RoomService Enhancements (`src/room/room.service.ts`)
- **Pagination**: Implemented `getRooms(page, limit)` using in-memory slicing of Redis keys.
- **REST Support**: Updated `createRoom` to return `roomId`.
- **Cleanup**: Removed unused `socket` parameter from `joinRoom`.

### 3. RoomGateway Updates (`src/room/room.gateway.ts`)
- Adapted `handleJoinRoom` to match the new `RoomService` signature.

## API Specification

### List Rooms
```http
GET /rooms?page=1&limit=20
Authorization: Bearer <token>
```

### Create Room
```http
POST /rooms
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "My Room",
  "type": "PVP",
  "difficulty": "MEDIUM",
  "isPrivate": false
}
```

### Join Room
```http
POST /rooms/:id/join
Content-Type: application/json
Authorization: Bearer <token>

{
  "password": "" // Optional
}
```

## Verification

### Automated Tests
*Pending implementation in `room.controller.spec.ts`.*

### Manual Verification
1. **Login**: Obtain JWT from `/auth/guest-login`.
2. **Create**: POST `/rooms` -> Returns `roomId`.
3. **List**: GET `/rooms` -> Returns list containing the new room.
4. **Join**: POST `/rooms/:id/join` -> Returns success and player list.
