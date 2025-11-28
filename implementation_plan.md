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
