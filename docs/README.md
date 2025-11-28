# Dou Dizhu (斗地主) - Technical Documentation

This directory contains technical documentation for the game's architecture and implementation.

## Documents

### [PHASE11_ARCHITECTURE.md](./PHASE11_ARCHITECTURE.md)
**State Machine & Event Bus Architecture (v2.0)**

Complete documentation for the new FSM-based game engine:
- Architecture overview and design decisions
- Event Bus implementation details
- State lifecycle and transitions
- React integration with `useGameEngine` hook
- Migration strategy from v1.0

**Key Features**: Decoupled logic, type-safe events, testable states

---

### [PHASE12_RULES_ENGINE.md](./PHASE12_RULES_ENGINE.md)
**Pure Functional Rules Engine**

Implementation plan and guide for the rules engine:
- Pattern detection algorithms (11 hand types)
- Move validation and comparison logic
- Pure functional design principles
- Comprehensive test suite (47+ test cases)
- Extensibility for future features (wild cards)

**Key Features**: Stateless, side-effect-free, fully tested

---

## Quick Reference

### Using the New State Machine
```typescript
import { useGameEngine } from './hooks/useGameEngine';

function MyComponent() {
    const { currentState, players, dispatch } = useGameEngine();
    
    // Dispatch actions
    dispatch({
        type: GameActionType.PLAY_CARDS,
        playerId: 'player-0',
        payload: { cards: selectedCards }
    });
}
```

### Using the Rules Engine
```typescript
import { analyze } from './rules/PatternDetector';
import { canBeat } from './rules/MoveComparator';

// Detect hand type
const result = analyze(cards);
console.log(result.type); // 'TRIO_WITH_ONE'

// Compare moves
const canWin = canBeat(previousMove, currentMove);
```

---

## Project Status

- ✅ **Phase 11**: State Machine & Event Bus - Complete
- ✅ **Phase 12**: Pure Functional Rules Engine - Complete
- 🔄 **Next**: Integration of v2.0 engine with main game

---

For more details, see the individual phase documents above.
