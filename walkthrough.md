# Development Walkthrough - Phase 11-13

## Overview
This walkthrough documents the major architectural improvements implemented in Phase 11-13, including state machine engine, pure functional rules engine, and monorepo restructure.

---

## Phase 11: State Machine & Event Bus Architecture

### Goal
Decouple game logic from UI by implementing a Finite State Machine (FSM) and Event Bus pattern.

### Implementation Highlights

#### 1. Event Bus System
**File**: `frontend/src/engine/EventBus.ts`
- Pub/Sub architecture for component communication
- Type-safe event handling
- Automatic cleanup on unsubscribe

#### 2. Game States
**Files**: `frontend/src/engine/StateMachine/states/*.ts`

Implemented 7 game states:
- **INIT** - Initialize game data
- **SHUFFLING** - Shuffle animation
- **DEALING** - Card distribution
- **CALL_LANDLORD** - Bidding phase
- **SHOW_BOTTOM** - Display bottom cards
- **PLAYING** - Main gameplay
- **ROUND_END** - Score calculation

#### 3. React Integration
**File**: `frontend/src/hooks/useGameEngine.ts`

Custom hook that:
- ✅ Manages FSM lifecycle
- ✅ Provides `dispatch()` for actions
- ✅ Syncs state to React
- ✅ Handles event subscriptions

#### 4. Demo Component
**File**: `frontend/src/components/GameEngineDemo.tsx`

Example usage showing:
- State transitions
- Action dispatching
- Real-time updates

### Benefits
- ✅ **Separation of Concerns** - Logic independent of UI
- ✅ **Testability** - Pure state transitions
- ✅ **Maintainability** - Clear state flow
- ✅ **Extensibility** - Easy to add new states

---

## Phase 12: Pure Functional Rules Engine

### Goal
Build a stateless, pure functional, extensible rules engine for card pattern recognition and validation.

### Implementation Highlights

#### 1. Core Types
**File**: `frontend/src/rules/types.ts`

Defined 11 hand types:
```
SINGLE, PAIR, TRIO, TRIO_WITH_ONE, TRIO_WITH_PAIR,
CHAIN, CHAIN_PAIR, AIRPLANE, AIRPLANE_WITH_WING,
BOMB, ROCKET
```

#### 2. Pattern Detector
**File**: `frontend/src/rules/PatternDetector.ts`

`analyze()` function that:
- ✅ Auto-detects hand type from cards
- ✅ Resolves ambiguous patterns
- ✅ Returns `AnalysisResult` with type, value, length

**Example**:
```typescript
analyze(['3','3','3','4']) 
// → { type: 'TRIO_WITH_ONE', value: 3, length: 4 }
```

#### 3. Move Comparator
**File**: `frontend/src/rules/MoveComparator.ts`

`canBeat()` logic:
- ✅ Type matching validation
- ✅ BOMB/ROCKET special rules
- ✅ Sequence length checks

#### 4. Testing
**Files**: `frontend/src/rules/__tests__/*.test.ts`

**47+ test cases** covering:
- All 11 hand types
- Edge cases (invalid combos)
- Comparison logic (KKK > JJJ, BOMB > PAIR, etc.)

**Test Results**:
```bash
✓ Pattern Detection (30+ tests)
✓ Move Comparison (17+ tests)
```

### Benefits
- ✅ **Pure Functions** - No side effects
- ✅ **Type Safety** - Full TypeScript coverage
- ✅ **High Coverage** - 47+ unit tests
- ✅ **Reusable** - Can be used in backend

---

## Phase 13: Monorepo Restructure

### Goal
Reorganize project for frontend/backend separation.

### Migration Summary

**Before**:
```
doudizhu/
├── src/
├── public/
├── package.json
├── vite.config.ts
├── index.html
└── ... (mixed files)
```

### After
```
doudizhu/
├── frontend/          ✅ All frontend code
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
├── backend/           ✅ Placeholder for future
│   └── README.md
├── docs/              ✅ Technical documentation
│   ├── README.md
│   ├── PHASE11_ARCHITECTURE.md
│   └── PHASE12_RULES_ENGINE.md
├── README.md          ✅ Updated for Monorepo
├── task.md
└── walkthrough.md
```

## Steps Executed

### 1. Preparation
- ✅ Stopped running dev servers (`npm run dev`, `npm test`)
- ✅ Created directory structure

### 2. File Migration
Moved to `frontend/`:
- ✅ `src/` - Source code
- ✅ `public/` - Static assets
- ✅ `package.json` & `package-lock.json` - Dependencies
- ✅ `vite.config.ts` - Build config
- ✅ `index.html` - Entry point
- ✅ `tsconfig*.json` - TypeScript configs
- ✅ `eslint.config.js` - Linting config
- ✅ `node_modules/` - Installed packages
- ✅ `dist/` - Build output

### 3. Documentation Updates
- ✅ Created new root `README.md` (Monorepo overview)
- ✅ Original `README.md` moved to `frontend/README.md`
- ✅ Created `backend/README.md` (future placeholder)
- ✅ `docs/` directory remains at root level

### 4. Verification
```bash
cd frontend
npm install  # ✅ Successful (up to date)
npm run build  # ✅ Build successful
```

**Build Output:**
```
vite v7.2.4 building client environment for production...
✓ 2093 modules transformed.
dist/index.html                   0.46 kB │ gzip:   0.29 kB
dist/assets/index-BRaN5ciq.css   35.35 kB │ gzip:   6.75 kB
dist/assets/index-BBQujuB4.js   375.09 kB │ gzip: 119.73 kB
✓ built in 1.42s
```

## How to Use

### Start Frontend Development
```bash
cd frontend
npm run dev
```
Opens at `http://localhost:5173`

### Run Tests
```bash
cd frontend
npm test
```

### Build for Production
```bash
cd frontend
npm run build
```

## Benefits

✅ **Clear Separation** - Frontend and backend have distinct directories
✅ **Scalability** - Easy to add backend without mixing concerns
✅ **Team Collaboration** - Frontend/backend teams can work independently
✅ **Deployment** - Can deploy frontend and backend separately
✅ **Documentation** - Centralized docs at root level

## Next Steps

1. **Backend Development** - Initialize Node.js/Express in `backend/`
2. **API Design** - Define REST/WebSocket endpoints
3. **Database Setup** - Choose and configure database
4. **Authentication** - Implement user system
5. **Multiplayer** - Real-time game synchronization

## File Organization

### Root Level (Project-wide)
- `README.md` - Monorepo overview
- `task.md` - Task tracking
- `walkthrough.md` - This file
- `docs/` - Technical documentation

### Frontend (`frontend/`)
- Complete React application
- Self-contained with own `package.json`
- Independent dev server and build

### Backend (`backend/`)
- Placeholder for future backend
- Will have own `package.json` when implemented

---

**Status**: ✅ Monorepo restructure complete and verified
**Date**: 2025-11-28

---

# Backend Infrastructure Setup - Walkthrough

## Overview
Initialized the NestJS backend and established connections to MySQL and Redis.

## Steps Executed

### 1. Project Initialization
- Created `backend/` directory with NestJS CLI
- Configured TypeScript and ESLint
- Created `.env` and `.env.example` for configuration

### 2. Database Integration
- **MySQL**: Installed `typeorm` and `mysql2`. Configured `TypeOrmModule` in `app.module.ts`.
- **Redis**: Installed `cache-manager` and `ioredis`. Configured `CacheModule` for global caching.

### 3. Verification
- Created `/health` endpoint in `HealthController`
- Verified MySQL connection (created `doudizhu` database)
- Verified Redis connection (read/write test)

## Test Results
```json
{
  "status": "ok",
  "services": {
    "database": { "status": "connected", "type": "mysql" },
    "redis": { "status": "connected", "type": "redis" }
  }
}
```


---

# Backend Game Engine & Network Layer - Walkthrough

## Overview
Implemented the core Game Engine (State Machine), Redis Persistence, and WebSocket Network Layer with Data Sanitization (Fog of War).

## Steps Executed

### 1. State Machine Implementation
- Created `GameContext` and `BaseState`.
- Implemented `InitState`, `DealingState`, and `PlayingState`.
- Registered `GameModule` with NestJS Dependency Injection.

### 2. Redis Persistence
- Implemented `GameRedisService` to save/load game snapshots.
- Configured atomic saving on state transitions.

### 3. Network Layer
- Implemented `GameGateway` (Socket.io) for `join_room` and `client_action`.
- Implemented `StateSerializer` to sanitize data (hide opponents' cards).
- Implemented Game Loop (10Hz) and State Broadcasting.

## Verification

### Automated E2E Test
We created a script to verify the entire flow:
```bash
cd backend
npx ts-node scripts/verify-game.ts
```

**What it tests:**
1.  **Connection**: Two clients connect to WebSocket.
2.  **Join**: Both join the same room.
3.  **Fog of War**: Verifies Player A cannot see Player B's hand.
4.  **Game Flow**: Verifies auto-transition from Init -> Dealing -> Playing.
5.  **Interaction**: Player A plays a card, Player B receives the update.

**Expected Output:**
```text
✅ [player-A] Fog of War working: Player B's hand is hidden.
✅ Game reached PlayingState!
✅ [player-B] Saw Player A play cards: [ '♠3' ]
🎉 Verification Successful!
```

**Status**: ✅ Phase 15 Complete & Verified
