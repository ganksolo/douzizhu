# Phase 28: Seating Logic & Basic AI

## 1. Goal
Implement stable seating logic (0-3 index-based) for the room system and introduce basic AI bots that can be added to rooms and perform simple moves. This ensures a consistent UI experience and allows for single-player testing or filling empty seats.

## 2. Key Features

### 2.1 Stable Seating Logic
- **Constraint**: Rooms have a fixed number of seats (default 4).
- **Behavior**: New players are assigned the first available seat index (0, 1, 2, or 3).
- **Persistence**: Seat definition is stored in Redis Hash `room:{id}:seats`.

### 2.2 Bot Management
- **Add Bot**: Host can manually add a bot to an empty seat.
- **Auto-Fill**: (Optional) Game start logic can auto-fill remaining seats with bots if configured (currently manual).
- **Bot Identity**: Bots have unique IDs (`bot-{timestamp}-{seat}`) and distinct avatars.

### 2.3 Game Start Orchestration
- **Triggers**: Game tries to start when:
  - `joinRoom` happens.
  - `toggleReady` happens.
  - `addBotToRoom` happens.
- **Conditions**: 
  - `players.length === maxPlayers`
  - All players (Real & Bot) are `ready`.
- **Result**: State transitions to `playing`, dealing occurs.

## 3. API Changes

### 3.1 New Endpoints

#### `POST /rooms/:id/ai`
Adds a bot to the specified room.
- **Auth**: Required
- **Permissions**: Any room member (currently), ideally Host only (future refinement).
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "userId": "bot-1700000000-1",
      "seat": 1,
      "nickname": "Bot 2",
      "isBot": true,
      ...
    }
  }
  ```

### 3.2 Logic Updates
- `joinRoom`: Logic changed from "push to list" to "find empty index".
- `leaveRoom`: Now clears specific index in Redis.

## 4. Technical Implementation

### Services
- **`BotService`**: Handles bot decision making (random/pass).
- **`RoomService`**: Manages Redis seat slotting.
- **`GameGateway`**: Invokes `BotService.checkAndPlay()` after every state broadcast.

### Data Structures
- **Redis `room:{id}:seats`**:
  - Key: `0`, `1`, `2`, `3`
  - Value: JSON string of `RoomPlayer` object.

## 5. Verification
- **Unit/Manual Test**:
  1. Create Room.
  2. Join (Seat 0).
  3. POST `/rooms/:id/ai` -> Bot fills Seat 1.
  4. Repeat until full.
  5. Verify "Game Start" log.
