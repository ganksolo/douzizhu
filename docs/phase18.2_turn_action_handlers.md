# Phase 18.2: Turn Manager & Action Handlers - Engineering Facts

## Overview
Phase 18.2 implements the turn management system and action execution handlers using the Strategy pattern. This enables deterministic turn rotation, pass logic with free-turn detection, and game-end condition checking, while delegating action-specific logic to dedicated handlers.

---

## 1. Architecture Pattern

### 1.1 Strategy Pattern

**ActionHandler Interface**:
```typescript
interface ActionHandler {
    handle(context: GameContext, action: GameAction): void;
}
```

**Concrete Implementations**:
- `PlayActionHandler`: Handles PLAY actions (card playing)
- `PassActionHandler`: Handles PASS actions

**Benefits**:
- **Extensibility**: Easy to add new action types (BID, CALL, ROB)
- **Separation of Concerns**: Each handler focuses on one action type
- **Testability**: Individual handlers can be unit tested in isolation

---

## 2. TurnManager

### 2.1 Responsibilities

1. **Turn Rotation**: Advance `currentTurn` to next player (clockwise/counter-clockwise)
2. **Pass Handling**: Detect round completion (all opponents passed)
3. **Game End Detection**: Check for winner (player with 0 cards)

### 2.2 Core Methods

#### nextTurn(context: GameContext): string

**Purpose**: Advance to the next player in rotation

**Algorithm**:
```typescript
players = context.roomData.players
currentIndex = findIndex(currentTurn)
nextIndex = (currentIndex + 1) % players.length  // Circular rotation

context.roomData.currentTurn = players[nextIndex].id
context.roomData.isAIThinking = false           // Reset AI flag

return nextPlayerId
```

**Turn Order** (4-player example):
```
Player A → Player B → Player C → Player D → Player A (循环)
```

**Side Effects**:
- Updates `context.roomData.currentTurn`
- Resets `isAIThinking` flag (allows AI turn to trigger again)

#### handlePass(context: GameContext, playerId: string): void

**Purpose**: Handle PASS action and detect free turns

**Logic**:
```typescript
1. nextTurn(context)  // Advance to next player

2. Check Free Turn Condition:
   if (currentTurn === lastPlayedCards.playerId) {
       // Everyone else passed, round winner gets free turn
       lastPlayedCards = undefined
   }
```

**Free Turn Definition**: When turn returns to the player who played the last cards

**Example Flow**:
```
Player A plays PAIR(K)
Player B passes → Turn to C
Player C passes → Turn to D
Player D passes → Turn to A
→ A won the round, lastPlayedCards cleared, A has free turn
```

#### checkGameEnd(context: GameContext): Player | null

**Purpose**: Detect game-ending condition

**Logic**:
```typescript
for (const player of context.roomData.players) {
    if (player.hand.length === 0) {
        return player;  // Winner found
    }
}
return null;  // Game continues
```

**Triggering**: Called after every PLAY action

---

## 3. PlayActionHandler

### 3.1 Execution Pipeline

**Method**: `handle(context: GameContext, action: GameAction): void`

**Steps**:

#### Step 1: Turn Validation
```typescript
if (context.roomData.currentTurn !== playerId) {
    throw new Error(`Not your turn! Current turn: ${currentTurn}`);
}
```

**Purpose**: Prevent out-of-turn plays

#### Step 2: Move Validation
```typescript
const cards = action.payload;  // Card[] from InputNormalizer
const validation = rulesService.validateMove(context, playerId, cards);

if (!validation.isValid) {
    throw new Error(validation.message);
}
```

**Delegates to**:
- `RulesService.validateMove()` (Phase 16)
  - Ownership check (anti-cheat)
  - Pattern detection
  - Comparison with `lastPlayedCards`

#### Step 3: State Update
```typescript
// 3a. Update lastPlayedCards
context.roomData.lastPlayedCards = {
    playerId: playerId,
    cards: cardStrings  // Convert Card[] back to string[]
};

// 3b. Remove cards from player's hand
for (const card of cards) {
    const idx = player.hand.findIndex(c => 
        CardConverter.toCard(c).rank === card.rank &&
        CardConverter.toCard(c).suit === card.suit
    );
    if (idx !== -1) {
        player.hand.splice(idx, 1);
    }
}

// 3c. Update handCount
player.handCount = player.hand.length;
```

**Critical**: Cards removed from hand to prevent duplication

#### Step 4: Game End Check
```typescript
const winner = turnManager.checkGameEnd(context);
if (winner) {
    logger.log(`Game Over! Winner: ${winner.name}`);
    context.transitionTo(gameEndState);
}
```

**State Transition**: If winner detected, switch to `GameEndState`

#### Step 5: Turn Advancement
```typescript
else {
    turnManager.nextTurn(context);
}
```

**Only if game continues**: Advance to next player

---

## 4. PassActionHandler

### 4.1 Execution Pipeline

**Method**: `handle(context: GameContext, action: GameAction): void`

**Steps**:

#### Step 1: Turn Validation
```typescript
if (context.roomData.currentTurn !== playerId) {
    throw new Error(`Not your turn!`);
}
```

#### Step 2: Free Turn Check
```typescript
if (!context.roomData.lastPlayedCards ||
    context.roomData.lastPlayedCards.playerId === playerId) {
    
    throw new Error('Cannot pass on a free turn. You must play cards.');
}
```

**Rule**: Player cannot pass when:
- No `lastPlayedCards` exists (game start)
- They were the last one to play cards (free turn)

**Rationale**: Free turn player must lead the round

#### Step 3: Execute Pass
```typescript
logger.log(`Player ${playerId} passed.`);
turnManager.handlePass(context, playerId);
```

**Delegates to**: `TurnManager.handlePass()` which advances turn and checks for free turn

---

## 5. Turn Flow Scenarios

### 5.1 Scenario: Normal Play Sequence

**Initial State**:
```
Players: [A, B, C, D]
currentTurn: A
lastPlayedCards: undefined (free turn)
```

**Sequence**:
```
1. A plays SINGLE(3)
   → currentTurn = B
   → lastPlayedCards = { playerId: 'A', cards: ['♠3'] }

2. B plays SINGLE(5)
   → currentTurn = C
   → lastPlayedCards = { playerId: 'B', cards: ['♥5'] }

3. C plays SINGLE(10)
   → currentTurn = D
   → lastPlayedCards = { playerId: 'C', cards: ['♦10'] }

4. D passes
   → currentTurn = A
   → lastPlayedCards = { playerId: 'C', cards: ['♦10'] } (unchanged)
```

**Result**: Turn advanced normally, `lastPlayedCards` persists

### 5.2 Scenario: Free Turn After Passes

**Initial State**:
```
Players: [A, B, C, D]
currentTurn: A
lastPlayedCards: undefined
```

**Sequence**:
```
1. A plays PAIR(K)
   → currentTurn = B
   → lastPlayedCards = { playerId: 'A', cards: [K♠, K♥] }

2. B passes
   → currentTurn = C
   → lastPlayedCards unchanged

3. C passes
   → currentTurn = D
   → lastPlayedCards unchanged

4. D passes
   → currentTurn = A (wrapped around)
   → Check: currentTurn (A) === lastPlayedCards.playerId (A)
   → lastPlayedCards = undefined (FREE TURN)
```

**Result**: A won the round and gets a free turn

### 5.3 Scenario: Invalid Pass on Free Turn

**Initial State**:
```
currentTurn: A
lastPlayedCards: undefined
```

**Action**: A attempts to PASS

**Validation**:
```typescript
PassActionHandler.handle():
  if (!lastPlayedCards) {
      throw Error('Cannot pass on a free turn')
  }
```

**Result**: PASS rejected, A must play cards

### 5.4 Scenario: Game End Detection

**Initial State**:
```
Player A hand: [A♠]
currentTurn: A
```

**Sequence**:
```
1. A plays SINGLE(A)
   → player.hand = [] (empty)
   
2. PlayActionHandler.handle():
   → turnManager.checkGameEnd()
   → Returns Player A (winner)
   
3. context.transitionTo(GameEndState)
```

**Result**: Game transitions to end state, no turn advancement

---

## 6. Input/Output Contracts

### 6.1 TurnManager.nextTurn()

**Input**:
```typescript
context: GameContext  // Current game state
```

**Output**:
```typescript
string  // Next player's ID
```

**Side Effects**:
- `context.roomData.currentTurn` updated
- `context.roomData.isAIThinking` reset to `false`

**Guarantees**:
- Always returns a valid player ID (if players exist)
- Circular rotation (never out of bounds)

### 6.2 TurnManager.handlePass()

**Input**:
```typescript
context: GameContext
playerId: string      // Player who passed
```

**Output**: `void`

**Side Effects**:
- Calls `nextTurn()` (advances turn)
- May clear `lastPlayedCards` (if free turn detected)

**Postconditions**:
- `currentTurn` changed to next player
- If all others passed, `lastPlayedCards === undefined`

### 6.3 PlayActionHandler.handle()

**Input**:
```typescript
context: GameContext
action: GameAction {
    type: ActionType.PLAY,
    playerId: string,
    payload: Card[],     // From InputNormalizer
    timestamp: number
}
```

**Output**: `void` (throws on error)

**Side Effects**:
- Updates `lastPlayedCards`
- Removes cards from `player.hand`
- May transition to `GameEndState`
- May advance turn (if game continues)

**Exceptions**:
- `"Not your turn!"` - Turn validation failed
- `"Invalid move"` - Rules validation failed

### 6.4 PassActionHandler.handle()

**Input**:
```typescript
context: GameContext
action: GameAction {
    type: ActionType.PASS,
    playerId: string,
    payload: undefined,
    timestamp: number
}
```

**Output**: `void` (throws on error)

**Side Effects**:
- Calls `turnManager.handlePass()` (advances turn, may clear `lastPlayedCards`)

**Exceptions**:
- `"Not your turn!"` - Turn validation
- `"Cannot pass on a free turn"` - Rule validation

---

## 7. Example Data Flows

### 7.1 Flow: Play Pair of Kings

**Initial State**:
```typescript
currentTurn: "player-A"
player-A.hand: ["K♠", "K♥", "Q♣", "5♠"]
lastPlayedCards: { playerId: "player-D", cards: ["10♠", "10♥"] }
```

**Action**:
```typescript
{
    type: ActionType.PLAY,
    playerId: "player-A",
    payload: [
        { rank: 13, suit: '♠', value: 13 },
        { rank: 13, suit: '♥', value: 13 }
    ]
}
```

**Execution**:
```typescript
1. PlayActionHandler.handle()

2. Turn check:
   currentTurn ("player-A") === playerId ("player-A") ✅

3. Rules validation:
   rulesService.validateMove()
   → Pattern: PAIR(K)
   → Compare: PAIR(K) vs PAIR(10) → K > 10 ✅
   → Ownership: Player holds both cards ✅
   → Result: { isValid: true }

4. State update:
   lastPlayedCards = { playerId: "player-A", cards: ["K♠", "K♥"] }
   player-A.hand = ["Q♣", "5♠"]  // Kings removed
   player-A.handCount = 2

5. Game end check:
   player-A.hand.length === 0? No ❌
   → Game continues

6. Turn advance:
   nextTurn(context)
   → currentTurn = "player-B"
```

**Result**: Valid play executed, turn advanced

### 7.2 Flow: Pass and Free Turn

**Initial State**:
```typescript
currentTurn: "player-D"
lastPlayedCards: { playerId: "player-A", cards: ["3♠"] }
```

**Action**:
```typescript
{
    type: ActionType.PASS,
    playerId: "player-D"
}
```

**Execution**:
```typescript
1. PassActionHandler.handle()

2. Turn check: ✅

3. Free turn check:
   lastPlayedCards exists? Yes ✅
   lastPlayedCards.playerId ("player-A") === playerId ("player-D")? No ✅
   → Valid pass

4. Execute pass:
   turnManager.handlePass()
   
5. TurnManager.handlePass():
   nextTurn() → currentTurn = "player-A"
   
   Check: currentTurn ("player-A") === lastPlayedCards.playerId ("player-A")?
   → Yes! Free turn detected
   
   lastPlayedCards = undefined  // Clear
```

**Result**: Turn advanced to A, free turn granted

---

## 8. Verification Steps

### 8.1 Unit Test Checklist

**TurnManager** (`turn-manager.spec.ts`):
- [ ] FLOW-001a: Normal rotation (A → B → C → D → A)
- [ ] FLOW-001b: `isAIThinking` reset on turn advance
- [ ] FLOW-002a: Grant free turn when all pass
- [ ] FLOW-002b: Do NOT clear `lastPlayedCards` if rotation incomplete
- [ ] FLOW-003a: Detect winner (0 cards)
- [ ] FLOW-003b: Return null if no winner

**PassActionHandler** (`pass-handler.spec.ts`):
- [ ] FLOW-004a: Reject PASS on free turn (no `lastPlayedCards`)
- [ ] FLOW-004b: Reject PASS when player is last one who played
- [ ] FLOW-004c: Reject PASS when not player's turn
- [ ] FLOW-004d: Allow PASS when valid

**PlayActionHandler** (Manual/Integration):
- [ ] Valid play executes and advances turn
- [ ] Invalid move throws error, state unchanged
- [ ] Game ends when player reaches 0 cards

### 8.2 Integration Test Scenarios

**Scenario 1: Full Round with Passes**
```
1. Player A plays SINGLE(3)
2. Player B plays SINGLE(5)
3. Player C plays SINGLE(10)
4. Player D passes
5. Player A passes
6. Player B passes

Expected: Player C gets free turn, lastPlayedCards cleared
```

**Scenario 2: Back-to-Back Plays**
```
1. Player A plays PAIR(K)
2. Player B plays PAIR(A)
3. Player C passes
4. Player D passes
5. Player A passes

Expected: Player B gets free turn
```

**Scenario 3: Game End Mid-Round**
```
1. Player A has 1 card remaining
2. Player A plays SINGLE(A)
3. PlayActionHandler detects 0 cards
4. Game transitions to GameEndState

Expected: No turn advancement, GameEndState entered
```

---

## 9. State Consistency Guarantees

### 9.1 Turn Invariants

**Invariant 1**: `currentTurn` always points to a valid player ID
```typescript
assert(players.some(p => p.id === currentTurn))
```

**Invariant 2**: After PLAY action, `lastPlayedCards.playerId` is the playing player
```typescript
assert(lastPlayedCards.playerId === playerId)
```

**Invariant 3**: Free turn is only granted when everyone else passed
```typescript
if (lastPlayedCards === undefined) {
    // Previous round completed, currentTurn player won
}
```

### 9.2 Card Removal Correctness

**Guarantee**: Cards are removed atomically per PLAY action

**Logic**:
```typescript
for (const card of cardsToPlay) {
    idx = hand.findIndex(matches(card))
    if (idx !== -1) {
        hand.splice(idx, 1)  // In-place removal
    }
}
```

**Edge Case Handling**:
- If card not found (should never happen after validation), skip silently
- `handCount` always synced with `hand.length`

---

## 10. Performance Characteristics

### 10.1 Complexity

- **nextTurn()**: O(n) where n = number of players (typically 4)
- **handlePass()**: O(1) - constant time check
- **checkGameEnd()**: O(n) - iterate all players
- **PlayActionHandler.handle()**: O(m) where m = cards to remove (typically ≤ 20)

**Total per action**: O(n + m) ≈ O(1) for typical game sizes

### 10.2 Execution Time

**Estimated per action**:
- Turn validation: < 1ms
- Rules validation: 1-5ms (pattern detection)
- State update: < 1ms
- Turn advancement: < 1ms

**Total**: < 10ms per action (excluding Redis I/O, added in Phase 18.3)

---

## 11. Known Limitations (Phase 18.2)

1. **No Concurrency Control**: Multiple simultaneous actions can race (fixed in Phase 18.3 with Redis locks)
2. **No State Persistence**: State updates not saved to Redis yet (added in Phase 18.3)
3. **Basic Pass Logic**: Only tracks last round, doesn't support complex multi-round scenarios
4. **No Timeout Handling**: Players can take infinite time (future enhancement)

---

## 12. Dependencies

### 12.1 Internal
- `RulesService`: Move validation (Phase 16)
- `TurnManager`: Turn logic
- `CardConverter`: Card string ↔ object conversion
- `GameEndState`: State transition target

### 12.2 External
- `@nestjs/common`: Injectable, Logger

---

**Status**: ✅ Phase 18.2 Complete  
**Author**: Backend Agent  
**Last Updated**: 2025-12-03
