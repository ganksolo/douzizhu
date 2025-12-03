# Phase 16: Backend Rules Engine (4-Player) - Engineering Facts

## Overview
Phase 16 implements a pure-functional, stateless rules engine for 4-player Dou Dizhu (2 decks, 108 cards). The engine handles pattern recognition, move comparison, and validation with support for advanced features including bomb grading, rocket detection, and complex sequence patterns.

---

## 1. Card System (2-Deck Support)

### 1.1 Card Ranks

```typescript
enum CardRank {
    THREE = 3,
    FOUR = 4,
    FIVE = 5,
    SIX = 6,
    SEVEN = 7,
    EIGHT = 8,
    NINE = 9,
    TEN = 10,
    JACK = 11,
    QUEEN = 12,
    KING = 13,
    ACE = 14,
    TWO = 15,
    SMALL_JOKER = 16,
    BIG_JOKER = 17
}
```

**Deck Composition**:
- Standard cards (3-A): 8 copies each (4 suits × 2 decks)
- Twos: 8 copies
- Small Jokers: 2 copies
- Big Jokers: 2 copies
- **Total**: 108 cards

### 1.2 Card Structure

```typescript
interface Card {
    rank: CardRank;
    suit: CardSuit;   // ♠, ♥, ♣, ♦, or '' (Jokers)
    value: number;    // For sorting (equals rank)
}
```

---

## 2. Pattern Types

### 2.1 Pattern Enum

```typescript
enum PatternType {
    // Basic Patterns
    SINGLE = 'SINGLE',
    PAIR = 'PAIR',
    TRIO = 'TRIO',
    
    // Trio Combinations
    TRIO_WITH_ONE = 'TRIO_WITH_ONE',        // 3+1
    TRIO_WITH_PAIR = 'TRIO_WITH_PAIR',      // 3+2
    
    // Sequences
    SEQUENCE = 'SEQUENCE',                   // 顺子 (5+ consecutive singles)
    SEQUENCE_PAIR = 'SEQUENCE_PAIR',         // 连对 (3+ consecutive pairs)
    AIRPLANE = 'AIRPLANE',                   // 飞机 (2+ consecutive trios)
    AIRPLANE_WITH_WING = 'AIRPLANE_WITH_WING',
    
    // Bombs (Graded by Count)
    BOMB_4 = 'BOMB_4',
    BOMB_5 = 'BOMB_5',
    BOMB_6 = 'BOMB_6',
    BOMB_7 = 'BOMB_7',
    BOMB_8 = 'BOMB_8',
    
    // Ultimate Bomb
    ROCKET = 'ROCKET',                       // 天王炸 (4 Jokers: 2 Small + 2 Big)
    
    INVALID = 'INVALID'
}
```

### 2.2 Analysis Result Structure

```typescript
interface AnalysisResult {
    type: PatternType;
    rank: number;           // Primary rank for comparison
    length: number;         // Number of cards
    bombCount?: number;     // For bombs: 4-8. For Rocket: 4.
    subRank?: number;       // Secondary rank (future use)
}
```

**Field Semantics**:
- **rank**: Highest rank in the pattern (e.g., for `3♠ 3♥ 3♣ 4♦`, rank = 3)
- **length**: Total card count
- **bombCount**: Used for bomb comparison priority (higher count > lower count)

---

## 3. Pattern Detector

### 3.1 Detection Algorithm

**Method**: `PatternDetector.detect(cards: Card[]): AnalysisResult`

**Detection Priority** (First match wins):
1. **Rocket** (4 Jokers)
2. **Bomb** (4-8 same rank)
3. **Single** (1 card)
4. **Pair** (2 same rank)
5. **Trio** (3 same rank)
6. **Trio+One** (3+1)
7. **Trio+Pair** (3+2)
8. **Sequence** (5+ consecutive singles)
9. **Sequence Pair** (3+ consecutive pairs)
10. **Airplane** (TODO - complex)
11. **INVALID**

### 3.2 Pattern Detection Rules

#### Rocket
**Definition**: Exactly 4 Jokers (2 Small + 2 Big)

**Example**:
```typescript
Input: [小王, 小王, 大王, 大王]
Output: { type: ROCKET, rank: 100, length: 4, bombCount: 4 }
```

#### Bomb
**Definition**: 4-8 cards of identical rank

**Examples**:
```typescript
// 4-Bomb
Input: [3♠, 3♥, 3♣, 3♦]
Output: { type: BOMB_4, rank: 3, length: 4, bombCount: 4 }

// 5-Bomb (2-deck special)
Input: [K♠, K♥, K♣, K♦, K♠]
Output: { type: BOMB_5, rank: 13, length: 5, bombCount: 5 }
```

**Bomb Grading**: Bombs are distinguished by count (BOMB_4, BOMB_5, ..., BOMB_8)

#### Trio with One
**Definition**: 3 cards of same rank + 1 kicker

**Example**:
```typescript
Input: [Q♠, Q♥, Q♣, 4♦]
Output: { type: TRIO_WITH_ONE, rank: 12, length: 4 }
```

**Note**: Rank refers to the trio, not the kicker

#### Trio with Pair
**Definition**: 3 cards of same rank + 2 kickers of same rank (Full House)

**Example**:
```typescript
Input: [8♠, 8♥, 8♣, 5♦, 5♠]
Output: { type: TRIO_WITH_PAIR, rank: 8, length: 5 }
```

#### Sequence (Straight)
**Definition**: 5+ consecutive cards (no 2s or Jokers allowed)

**Examples**:
```typescript
// Valid
Input: [9, 8, 7, 6, 5]
Output: { type: SEQUENCE, rank: 9, length: 5 }

// Invalid (contains 2)
Input: [A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2]
Output: { type: INVALID, rank: 0, length: 0 }
```

**Constraints**:
- Minimum length: 5
- Maximum rank: Ace (14)
- Cannot wrap around (A-2-3 invalid)

#### Sequence of Pairs
**Definition**: 3+ consecutive pairs (no 2s or Jokers)

**Example**:
```typescript
Input: [10♠, 10♥, 9♣, 9♦, 8♠, 8♥]
Output: { type: SEQUENCE_PAIR, rank: 10, length: 6 }
```

---

## 4. Move Comparator

### 4.1 Comparison Rules

**Method**: `MoveComparator.compare(prev: AnalysisResult, current: AnalysisResult): number`

**Return Values**:
- `1`: Current beats previous
- `-1`: Current loses to previous
- `0`: Invalid comparison (type/length mismatch)

### 4.2 Comparison Priority

**Hierarchy** (Highest to Lowest):
1. **Rocket** > All
2. **Bombs** > Normal Patterns
3. **Normal Patterns** (must match type + length)

### 4.3 Bomb Comparison Logic

**Rule 1**: Bomb Count Priority
```typescript
5-Bomb > 4-Bomb (regardless of rank)
BOMB_6(3s) > BOMB_5(As)  // 6-count beats 5-count
```

**Rule 2**: Same Count → Compare Rank
```typescript
BOMB_4(Ks) > BOMB_4(Qs)  // Same count, higher rank wins
```

**Example Flow**:
```typescript
compare(BOMB_4(rank=10), BOMB_5(rank=3))
// Step 1: Count check: 5 > 4
// Result: 1 (current wins)

compare(BOMB_4(rank=13), BOMB_4(rank=11))
// Step 1: Count check: 4 == 4
// Step 2: Rank check: 13 > 11
// Result: 1 (current wins)
```

### 4.4 Normal Pattern Comparison

**Preconditions**:
- `current.type === prev.type`
- `current.length === prev.length`

**Logic**: Compare `rank` field

**Examples**:
```typescript
// Valid
compare(PAIR(rank=Ace), PAIR(rank=King))
// Result: 1 (Ace > King)

// Invalid (type mismatch)
compare(SEQUENCE(5 cards), PAIR(2 cards))
// Result: 0 (cannot compare)
```

---

## 5. Move Validator

### 5.1 Validation Pipeline

**Method**: `MoveValidator.validate(context, playerId, cards): ValidationResult`

**Pipeline Steps**:
1. **Ownership Check**: Verify player holds all cards (anti-cheat)
2. **Pattern Detection**: Call `PatternDetector.detect()`
3. **Context Validation**:
   - Free turn: Any valid pattern allowed
   - Following: Pattern must beat `lastPlayedCards`
4. **Turn Check**: Verify it's player's turn

### 5.2 ValidationResult Structure

```typescript
interface ValidationResult {
    valid: boolean;
    reason?: string;          // Error message if invalid
    analysis?: AnalysisResult; // Detected pattern if valid
}
```

### 5.3 Validation Examples

#### Valid Move (Free Turn)
```typescript
Input:
  context.lastPlayedCards = undefined
  playerId = "player-A"
  cards = [3♠]

Process:
  1. Ownership: ✅ Player holds 3♠
  2. Pattern: SINGLE(rank=3)
  3. Context: Free turn, any valid pattern OK
  4. Turn: ✅ currentTurn === "player-A"

Output: { valid: true, analysis: {...} }
```

#### Invalid Move (Cannot Beat)
```typescript
Input:
  context.lastPlayedCards = { playerId: "B", cards: [K♠, K♥] }
  playerId = "player-A"
  cards = [Q♠, Q♥]

Process:
  1. Ownership: ✅
  2. Pattern: PAIR(rank=12)
  3. Context: compare(PAIR(13), PAIR(12)) = -1 ❌
  
Output: { valid: false, reason: "Cannot beat previous move" }
```

#### Invalid Move (Cheating)
```typescript
Input:
  player.hand = [3♠, 4♥, 5♣]
  cards = [A♠]

Process:
  1. Ownership: ❌ Player does not hold A♠

Output: { valid: false, reason: "Player does not own these cards" }
```

---

## 6. Rules Service (Facade)

### 6.1 Service API

**Provider**: Injectable NestJS service

**Methods**:

#### validateMove(context, playerId, cards)
**Purpose**: Full validation pipeline  
**Returns**: `ValidationResult`  
**Usage**: Called by `PlayActionHandler`

#### compareMoves(prev, current)
**Purpose**: Direct comparison  
**Returns**: `-1 | 0 | 1`  
**Usage**: Used internally by validator

#### analyze(cards)
**Purpose**: Pattern detection  
**Returns**: `AnalysisResult`  
**Usage**: Used by AI and testing

#### sortCards(cards)
**Purpose**: Utility for sorting  
**Returns**: Sorted card array

### 6.2 Integration Point

```typescript
// In PlayActionHandler
const result = rulesService.validateMove(context, playerId, inputCards);
if (!result.valid) {
    throw new Error(result.reason);
}

// Update game state
context.roomData.lastPlayedCards = {
    playerId,
    cards: inputCards
};
```

---

## 7. Input/Output Contracts

### 7.1 PatternDetector.detect()

**Input**:
```typescript
cards: Card[]  // Unsorted, unvalidated
```

**Output**:
```typescript
AnalysisResult {
    type: PatternType,
    rank: number,
    length: number,
    bombCount?: number
}
```

**Guarantees**:
- Always returns a result (INVALID if no pattern matches)
- Idempotent (same input → same output)
- No side effects

### 7.2 MoveValidator.validate()

**Input**:
```typescript
context: GameContext   // Current game state
playerId: string       // Player attempting move
cards: Card[]          // Cards to play
```

**Output**:
```typescript
ValidationResult {
    valid: boolean,
    reason?: string,
    analysis?: AnalysisResult
}
```

**Preconditions**:
- `context.roomData.players` contains `playerId`
- `cards` is non-empty array

**Postconditions**:
- If `valid === true`, `analysis` is populated
- If `valid === false`, `reason` explains why

---

## 8. Example Data Flows

### 8.1 Flow: Player Plays a Bomb

**Input**:
```typescript
Player Hand: [K♠, K♥, K♣, K♦, Q♠, 3♥]
Previous Move: PAIR(10s)
Action: Play [K♠, K♥, K♣, K♦]
```

**Execution**:
```typescript
1. validate(context, "player-A", [K♠, K♥, K♣, K♦])
   
2. Ownership Check:
   - Player holds all 4 Kings ✅
   
3. Pattern Detection:
   - PatternDetector.detect([K♠, K♥, K♣, K♦])
   - Result: { type: BOMB_4, rank: 13, bombCount: 4 }
   
4. Context Validation:
   - Previous: PAIR (normal pattern)
   - Current: BOMB_4
   - Bomb beats normal ✅
   
5. Turn Check:
   - currentTurn === "player-A" ✅

6. Return: { valid: true, analysis: {...} }
```

**Result**: Move accepted

### 8.2 Flow: Rocket vs Bomb

**Scenario**: Previous player plays 5-Bomb, current player plays Rocket

**Comparison**:
```typescript
prev = { type: BOMB_5, rank: 10, bombCount: 5 }
current = { type: ROCKET, rank: 100, bombCount: 4 }

MoveComparator.compare(prev, current)
// Step 1: current.type === ROCKET
// Return: 1 (Rocket beats everything)
```

---

## 9. Edge Cases & Constraints

### 9.1 2-Deck Specific Cases

**Bomb Count > 4**:
- Possible in 2-deck game (e.g., 5 Kings)
- Properly handled by `BOMB_5`, `BOMB_6`, etc.

**Multiple Rockets**:
- Theoretically impossible (only 4 Jokers total)
- Edge case: If somehow two Rockets exist, compare returns `0`

### 9.2 Sequence Constraints

**No 2s or Jokers**:
- Sequences must end at Ace (rank 14)
- Reason: 2s are high cards in Dou Dizhu

**No Wrapping**:
- `[A, 2, 3, 4, 5]` is INVALID
- `[K, A]` pair is valid, but `[K, A, 2, 3, 4]` sequence is not

### 9.3 Pattern Ambiguity Resolution

**Priority Example**:
```typescript
Input: [3♠, 3♥, 3♣, 3♦]

Check Order:
1. Rocket? No (not Jokers)
2. Bomb? Yes → Return BOMB_4

Note: Could also be TRIO_WITH_ONE, but Bomb has higher priority
```

---

## 10. Verification Steps

### 10.1 Unit Test Checklist

**Pattern Detection**:
- [ ] Rocket recognized correctly (2 Small + 2 Big Jokers)
- [ ] 4-Bomb, 5-Bomb, 6-Bomb, 7-Bomb, 8-Bomb all detected
- [ ] Trio+One: `[Q, Q, Q, 4]` → TRIO_WITH_ONE(rank=12)
- [ ] Trio+Pair: `[8, 8, 8, 5, 5]` → TRIO_WITH_PAIR(rank=8)
- [ ] Sequence: `[9, 8, 7, 6, 5]` → SEQUENCE(rank=9)
- [ ] Sequence Pair: `[10, 10, 9, 9, 8, 8]` → SEQUENCE_PAIR(rank=10)

**Comparison Logic**:
- [ ] Rocket > Any Bomb
- [ ] 5-Bomb > 4-Bomb (count priority)
- [ ] BOMB_4(K) > BOMB_4(Q) (rank tiebreaker)
- [ ] PAIR(A) > PAIR(K)
- [ ] SEQUENCE(5 cards) cannot beat PAIR(2 cards) → returns 0

**Validation**:
- [ ] Playing cards not in hand → `valid: false`
- [ ] Playing PAIR(Q) after PAIR(K) → `valid: false`
- [ ] Playing Bomb after PAIR → `valid: true`

### 10.2 Integration Test Scenarios

**Scenario 1: Normal Play**
```
Player A: Plays SINGLE(3)
Player B: Plays SINGLE(5) → Valid
Player C: Plays SINGLE(4) → Invalid (cannot beat 5)
```

**Scenario 2: Bomb Override**
```
Player A: Plays SEQUENCE(5,6,7,8,9)
Player B: Plays BOMB_4(3s) → Valid (bomb beats normal)
Player C: Plays BOMB_5(4s) → Valid (5-bomb beats 4-bomb)
```

### 10.3 Test Files

**Location**: `backend/src/game/rules/`
- `rules.spec.ts`: Core rules tests
- `rules_gap.spec.ts`: Edge case tests (4-player specific)

**Execution**:
```bash
npm test src/game/rules
```

**Expected Coverage**: 100% for PatternDetector, MoveComparator

---

## 11. Performance Characteristics

### 11.1 Complexity Analysis

- **PatternDetector.detect()**: O(n log n) - dominated by sorting
- **MoveComparator.compare()**: O(1) - simple comparison
- **MoveValidator.validate()**: O(n) - ownership check iterates hand

Where `n` = number of cards in input (typically ≤ 20)

### 11.2 Optimization Notes

- Detection uses early returns (Rocket/Bomb checked first)
- No backtracking or recursion (deterministic, linear flow)
- Stateless functions (no memory overhead)

---

## 12. Known Limitations (Phase 16)

1. **Airplane Detection**: Not fully implemented (marked TODO)
2. **No AI Move Generation**: Rules only validate, don't suggest (added in Phase 17)
3. **Card String Parsing**: Cards must be pre-parsed to `Card` objects

---

**Status**: ✅ Phase 16 Complete
**Author**: Backend Agent  
**Last Updated**: 2025-12-03
