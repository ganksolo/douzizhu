# Phase 12: Pure Functional Rules Engine

## Goal
Build a stateless, pure functional, extensible rules engine that serves as the core "referee" system for the game. This will replace/enhance the existing rules.ts with a more robust, testable architecture.

## User Review Required

> [!IMPORTANT]
> **Architecture Decision**: This new rules engine will be built in parallel with existing `src/utils/rules.ts`. Once complete and tested, we can gradually migrate or keep both systems (old for legacy, new for v2.0 engine).

## Proposed Changes

### Core Type System

#### [NEW] `src/rules/types.ts`
Define core types for the rules engine:
- `HandType` enum: All 11 hand types (SINGLE, PAIR, TRIO, TRIO_WITH_ONE, TRIO_WITH_PAIR, CHAIN, CHAIN_PAIR, AIRPLANE, AIRPLANE_WITH_WING, BOMB, ROCKET)
- `AnalysisResult` interface:
  ```typescript
  interface AnalysisResult {
    type: HandType;
    value: number;        // Core rank value
    length: number;       // For chains/sequences
    kickers?: number[];   // Attached cards (for trio+1, etc)
  }
  ```
- `Card` type (may reuse from existing types.ts)

---

### Pattern Detection

#### [NEW] `src/rules/PatternDetector.ts`
Core pattern recognition engine:
- `analyze(cards: Card[]): AnalysisResult | null`
  - Pure function: no side effects
  - Auto-detects hand type
  - Returns null if invalid combination

**Key Algorithms**:
1. **Single/Pair/Trio**: Count frequencies
2. **Chains (Straights)**: Sort + check consecutive ranks
3. **Chain Pairs**: Group pairs, check consecutive
4. **Airplane**: Find multiple trios in sequence
5. **Airplane with Wings**: Separate body from wings
6. **Bomb**: 4 of a kind
7. **Rocket**: Both jokers

**Priority Order** (when ambiguous):
1. ROCKET (highest priority)
2. BOMB
3. AIRPLANE_WITH_WING
4. AIRPLANE
5. TRIO_WITH_PAIR
6. TRIO_WITH_ONE
7. CHAIN_PAIR
8. CHAIN
9. TRIO
10. PAIR
11. SINGLE

---

### Validation & Comparison

#### [NEW] `src/rules/MoveValidator.ts`
Validates if a move is legal:
- `isValidMove(cards: Card[]): boolean`
  - Check if cards form valid hand type
- `canPlayFirst(cards: Card[]): boolean`
  - Any valid hand type allowed

#### [NEW] `src/rules/MoveComparator.ts`
Compares two moves:
- `canBeat(previous: AnalysisResult, current: AnalysisResult): boolean`
  
**Rules**:
1. Type must match (exception: BOMB/ROCKET)
2. BOMB beats any non-BOMB
3. ROCKET beats everything
4. Same type: compare `value`
5. Chains/sequences: must have same `length`

---

### Testing

#### [NEW] `src/rules/__tests__/PatternDetector.test.ts`
Test pattern detection:
- ✅ Detect TRIO_WITH_ONE: [3,3,3,4] → value: 3
- ✅ Detect CHAIN: [3,4,5,6,7] → value: 3
- ✅ Detect AIRPLANE: [3,3,3,4,4,4] → value: 3
- ✅ Detect BOMB: [5,5,5,5] → value: 5
- ✅ Detect ROCKET: [BlackJoker, RedJoker]

#### [NEW] `src/rules/__tests__/MoveComparator.test.ts`
Test comparison logic:
- ✅ KKK > JJJ
- ✅ BOMB(4444) > PAIR(22)
- ✅ ROCKET > BOMB
- ✅ CHAIN(34567) vs CHAIN(45678) - length match required
- ✅ Invalid: TRIO vs PAIR - different types

---

### Extensibility

#### [NEW] `src/rules/interfaces/WildCardTransformer.ts` (stub)
Interface for future wild card support:
```typescript
interface WildCardTransformer {
  transform(cards: Card[], wildCard: Card): Card[];
}
```

---

## File Structure
```
src/rules/
  ├── types.ts                    (Core types)
  ├── PatternDetector.ts          (Pattern recognition)
  ├── MoveValidator.ts            (Validation logic)
  ├── MoveComparator.ts           (Comparison logic)
  ├── interfaces/
  │   └── WildCardTransformer.ts  (Future extension)
  └── __tests__/
      ├── PatternDetector.test.ts
      ├── MoveComparator.test.ts
      └── MoveValidator.test.ts
```

## Verification Plan

### Automated Tests
- Run `npm test` or `npx vitest` (need to set up vitest if not already)
- All test files must pass
- Coverage target: >90% for core logic

### Manual Verification
1. Compare results with existing `rules.ts`
2. Test edge cases: empty array, single joker, etc.
3. Performance: benchmark with 1000 random hands

## Migration Strategy
1. **Parallel Implementation**: Build new engine alongside old
2. **Testing**: Ensure 100% compatibility with existing behavior
3. **Integration**: Update v2.0 states to use new engine
4. **Deprecation**: Mark old rules.ts as deprecated (optional)
