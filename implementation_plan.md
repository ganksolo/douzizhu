# Phase 11: State Machine & Event Bus Architecture (v2.0)

## Goal
Completely refactor the game logic layer to introduce:
1. **Event Bus**: Strongly-typed Publish/Subscribe system for decoupled communication
2. **Finite State Machine (FSM)**: Strict state management with validation and lifecycle hooks
3. **React Integration Layer**: Clean separation between game engine and UI

This will eliminate UI/Logic coupling and create a more maintainable, testable architecture.

## Proposed Changes

### Core Infrastructure

#### [NEW] `src/engine/EventBus.ts`
- Strongly-typed event system with TypeScript generics
- Methods: `on<T>(event, callback)`, `off(event, callback)`, `emit<T>(event, data)`
- Event types: `GAME_START`, `STATE_CHANGE`, `PLAYER_ACTION`, `CARD_DEALT`, `TURN_CHANGE`, `ERROR`, `TIMER_TICK`

#### [NEW] `src/engine/GameStateEnum.ts`
- Enum defining all game states:
  - `INIT` → `SHUFFLING` → `DEALING` → `CALL_LANDLORD` → `SHOW_BOTTOM` → `PLAYING` → `ROUND_END` → `GAME_END`

---

### State Machine System

#### [NEW] `src/engine/StateMachine/BaseState.ts`
Abstract base class with lifecycle methods:
- `enter(data?: any): void` - Initialization when entering state
- `update(deltaTime: number): void` - Frame loop for timers/auto-logic
- `exit(): void` - Cleanup when leaving state
- `validate(action: GameAction): boolean` - Guard clause to reject invalid actions

#### [NEW] `src/engine/StateMachine/GameContext.ts`
Central state manager:
- Holds `currentState: BaseState` instance
- `changeState(newState: GameStateEnum, data?: any): void`
  - Calls old state's `exit()`
  - Instantiates and calls new state's `enter(data)`
  - Emits `STATE_CHANGE` event via EventBus
- `dispatch(action: GameAction): void` - Entry point for all game actions
- `update(deltaTime: number): void` - Forwards to current state

---

### Concrete State Implementations

#### [NEW] `src/engine/StateMachine/states/InitState.ts`
- `enter()`: Reset game data, prepare deck
- Automatically transitions to `SHUFFLING`

#### [NEW] `src/engine/StateMachine/states/ShufflingState.ts`
- `enter()`: Start shuffle animation timer
- `update()`: Check if shuffle complete, transition to `DEALING`

#### [NEW] `src/engine/StateMachine/states/DealingState.ts`
- `enter()`: Start dealing cards animation
- `update()`: Track cards dealt, auto-transition to `CALL_LANDLORD` when complete
- `validate()`: Reject all player actions during dealing

#### [NEW] `src/engine/StateMachine/states/CallLandlordState.ts`
- `enter()`: Set current bidder
- `validate()`: Only accept `BID` actions from current bidder
- Transition to `SHOW_BOTTOM` when landlord determined

#### [NEW] `src/engine/StateMachine/states/PlayingState.ts`
- `enter()`: Set current turn player
- `validate()`: 
  - Check if action is from current turn player
  - Check if `PLAY` action has valid cards
  - Check if `PASS` is allowed
- Handle win condition → transition to `ROUND_END`

#### [NEW] `src/engine/StateMachine/states/RoundEndState.ts`
- `enter()`: Calculate scores, update stats
- Display results, allow restart

---

### React Integration

#### [MODIFY] `src/hooks/useGameEngine.ts`
New hook to replace `useGameLoop`:
- Subscribe to EventBus events in `useEffect`
- Sync game state to React `useState` for rendering only
- Expose `dispatch(action)` function for UI to trigger actions
- Start update loop with `requestAnimationFrame` for `update()`

#### [MODIFY] `src/components/GameTable.tsx`
- Replace direct state modifications with `dispatch()` calls
- Example: `onPlayClick` → `dispatch({ type: 'PLAY', cards: selectedCards })`

---

## File Structure
```
src/
  engine/
    EventBus.ts
    GameStateEnum.ts
    GameAction.ts           (Action type definitions)
    StateMachine/
      BaseState.ts
      GameContext.ts
      StateFactory.ts       (Factory to create state instances)
      states/
        InitState.ts
        ShufflingState.ts
        DealingState.ts
        CallLandlordState.ts
        ShowBottomState.ts
        PlayingState.ts
        RoundEndState.ts
        GameEndState.ts
```

## Verification Plan

### Automated Tests
- Unit tests for EventBus (subscribe, unsubscribe, emit)
- Unit tests for state transitions
- Unit tests for action validation

### Manual Verification
1. Start game → verify smooth state transitions
2. Try invalid actions (e.g., play cards during dealing) → should be rejected
3. Check console for state change logs
4. Verify UI updates correctly via EventBus

## Migration Strategy
1. Build new engine in parallel (doesn't break existing code)
2. Create adapter hook to test new engine
3. Gradually migrate components one by one
4. Remove old `useGameLoop` once migration complete

---

# Phase 14: Backend Development

## Goal
Establish a robust, scalable backend using NestJS to handle game logic, user management, and real-time multiplayer features.

## Proposed Changes

### Infrastructure
#### [NEW] `backend/`
- **Framework**: NestJS (Modular architecture)
- **Database**: MySQL (TypeORM) for persistent data
- **Cache**: Redis (CacheManager) for session/game state
- **API**: RESTful for management, Socket.io for gameplay

### Authentication System
#### [NEW] `backend/src/auth/`
- **JWT Strategy**: Stateless authentication
- **Guards**: `JwtAuthGuard` for protecting endpoints
- **Decorators**: `@CurrentUser()` for easy user access

### User Management
#### [NEW] `backend/src/users/`
- **Entity**: `User` (id, username, passwordHash, stats)
- **Service**: CRUD operations, stats updates
- **Controller**: Profile management, history retrieval

### Game Session Management
#### [NEW] `backend/src/games/`
- **Entity**: `Game` (history), `Room` (active)
- **Gateway**: `GameGateway` (WebSocket) for real-time events
- **Manager**: `GameManager` service to handle game loops (reusing `src/rules` logic via shared library or copy)

## Verification Plan

### Automated Tests
- **Unit Tests**: Services and logic
- **E2E Tests**: API endpoints using Supertest
- **Load Tests**: WebSocket connection limits

### Manual Verification
- **Postman/Curl**: Test REST endpoints
- **Socket.io Client**: Test connection and event emission

---

# Phase 15: Backend Game Engine Core

## Goal
Implement the core game logic on the backend using a State Machine pattern, ensure data persistence with Redis, and establish real-time communication via WebSocket.

## Implemented Changes

### State Machine Skeleton
#### `backend/src/game/engine/`
- **BaseState**: Abstract class defining lifecycle hooks (`enter`, `update`, `exit`, `handleInput`).
- **GameContext**: Central manager injecting `GameRedisService` and State singletons. Handles transitions and atomic snapshots.
- **States**: `InitState`, `DealingState`, `PlayingState` implemented.

### Redis Persistence
#### `backend/src/game/services/game-redis.service.ts`
- **Structure**: Hash `room:{id}:state` storing `current_state_name` and JSON-serialized `room_data`.
- **Atomic Saves**: State transitions automatically trigger `saveSnapshot()`.
- **Restoration**: `loadSnapshot()` rebuilds `RoomData` and restores the correct State instance.

### Network Layer & Fog of War
#### `backend/src/game/gateway/game.gateway.ts`
- **WebSocket**: Socket.io gateway handling `join_room` and `client_action`.
- **Game Loop**: `setInterval` driving `GameContext.update()` (10Hz).
- **Broadcasting**: `onStateChange` callback triggers `sync_state` emission.

#### `backend/src/game/services/state-serializer.service.ts`
- **Data Sanitization**: Filters sensitive data (other players' hands, hidden bottom cards) based on `playerId` and `currentState`.

## Verification Plan

### Automated Verification
Run the E2E verification script:
```bash
cd backend
npx ts-node scripts/verify-game.ts
```
This script simulates two clients, verifies state transitions, checks Fog of War (hidden hands), and confirms action broadcasting.

### Manual Verification
1. Start Backend: `npm run start:dev`
2. Connect Socket.io client (e.g., Postman or custom UI).
3. Join room and observe logs for state synchronization.

---

# Phase 15.3.1: Multi-Room Architecture Fix

## Issue Identified
**Bug**: `GameContext` was implemented as a singleton, causing state pollution across different rooms. Multiple rooms would share the same `GameContext` instance, leading to race conditions and incorrect game states.

## Solution Implemented

### GameManagerService
#### `backend/src/game/services/game-manager.service.ts`
- **Purpose**: Factory service managing multiple `GameContext` instances
- **Data Structure**: `Map<roomId, GameContext>` 
- **Methods**:
  - `getOrCreateRoom(roomId)`: Returns existing or creates new GameContext for the room
  - `removeRoom(roomId)`: Cleans up finished games
  - `getAllRooms()`: Returns list of active room IDs for game loop iteration

### Updated GameGateway
#### Changes to `backend/src/game/gateway/game.gateway.ts`
- Replaced singleton `GameContext` injection with `GameManagerService`
- Modified `handleJoinRoom` to get room-specific context
- Updated game loop to iterate over all active rooms
- Each room now has its own isolated state machine

## Current Status
✅ **Completed**: Multi-room isolation implemented  
⚠️ **In Progress**: Debugging state initialization timing issue where `getCurrentStateName()` returns "None" instead of expected state names
