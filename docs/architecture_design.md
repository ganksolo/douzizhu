# 4-Player Dou Dizhu - Full Stack Architecture Design

## 1. High-Level Architecture
The system follows a **Monorepo** structure to ensure code sharing and type safety across the stack.

```mermaid
graph TD
    Client[Frontend (React/Vite)] <-->|WebSocket/HTTP| LB[Load Balancer / Nginx]
    LB <--> Server[Backend (NestJS)]
    
    subgraph "Shared Core (NPM Workspace)"
        Types[Types & Interfaces]
        Rules[Rules Engine]
        FSM[State Machine]
        AI[AI Algorithms]
    end
    
    Client -.-> Types & Rules & FSM & AI
    Server -.-> Types & Rules & FSM & AI
    
    Server <--> Redis[(Redis Cache)]
    Server <--> DB[(MySQL Database)]
    
    subgraph "Advanced Systems"
        Replay[Replay System]
        Logger[Log System]
        Test[Auto Test System]
    end
    
    Server --> Replay & Logger
```

---

## 2. Directory Structure

```
doudizhu/
├── packages/                  # Shared Workspaces
│   └── game-core/             # 🟢 THE BRAIN (Logic Reuse)
│       ├── src/
│       │   ├── rules/         # Pure functional rules (Pattern detection, Comparison)
│       │   ├── engine/        # Finite State Machine (FSM)
│       │   ├── ai/            # AI Strategy & Heuristics
│       │   └── types/         # Shared DTOs, Enums, Interfaces
│       └── package.json
│
├── frontend/                  # 🟡 THE FACE (Presentation)
│   ├── src/
│   │   ├── components/        # React UI Components
│   │   ├── hooks/             # UI Logic Hooks (useGameClient)
│   │   ├── assets/            # Images, Sounds
│   │   └── stores/            # Local UI State (Zustand/Recoil)
│   └── package.json
│
├── backend/                   # 🔵 THE SPINE (Server & Persistence)
│   ├── src/
│   │   ├── auth/              # JWT Authentication
│   │   ├── users/             # User Management
│   │   ├── games/             # Game Session Management
│   │   │   ├── gateway/       # WebSocket Gateway
│   │   │   └── services/      # Game Logic Orchestration
│   │   ├── replay/            # Replay System
│   │   └── common/            # Filters, Guards, Interceptors
│   └── package.json
│
├── docs/                      # Documentation
└── package.json               # Root Monorepo Config
```

---

## 3. Module Details

### A. Shared Game Engine (`packages/game-core`)
*Goal: Write Once, Run Everywhere. Ensure server validation matches client prediction.*
- **Rules Engine**: Pure functions. `analyze(cards) -> HandType`. `canBeat(prev, next) -> boolean`.
- **State Machine**: `GameContext` that accepts `Actions` and emits `Events`.
  - **Server Mode**: Authoritative. Validates moves, updates state, broadcasts events.
  - **Client Mode**: Predictive. Updates local state immediately for responsiveness, rolls back on server error.
- **AI**: `findBestMove(hand, gameState)`. Used by Client (offline/hint) and Server (bot players).

### B. Backend System (`backend`)
*Tech Stack: NestJS + TypeORM + Redis + Socket.io*

1.  **Real-time Sync Layer (WebSocket)**
    -   **Events**: `join_room`, `play_card`, `pass`, `emoji`
    -   **Room Management**: Redis-based room state for low latency.
    -   **Concurrency**: Use Redis distributed locks for atomic game actions.

2.  **Storage Layer**
    -   **MySQL**:
        -   `users`: Accounts, Profiles.
        -   `matches`: Completed game records (metadata).
        -   `replays`: Compressed binary/JSON of game actions.
    -   **Redis**:
        -   `room:{id}`: Ephemeral game state.
        -   `session:{token}`: User session data.

3.  **Advanced Subsystems**
    -   **Replay System**:
        -   Record every `Action` (timestamp, player, payload) into an event stream.
        -   Save to MySQL/S3 on game end.
        -   Endpoint `GET /replays/:id` returns the event stream.
        -   Frontend "plays" the stream through the FSM to visualize the game.
    -   **Logging & Analytics**:
        -   Structured logging (Winston) for all game errors and critical state changes.
        -   Async job queue (Bull) to process game stats (win rates, card usage) after matches.
    -   **AI Debugging**:
        -   Server-side "Spectator" mode where AI exposes its internal weight calculations via a dedicated WebSocket channel (admin only).

### C. Frontend System (`frontend`)
*Tech Stack: React + Framer Motion + Zustand*
-   **Presentation Only**: The UI renders based on the `GameState` provided by the FSM.
-   **Prediction**: Optimistic UI updates for smooth feel.
-   **Replay Player**: A specialized mode that feeds the FSM from a recorded log instead of live socket events.

---

## 4. Scalability & Extensibility

-   **Horizontal Scaling**:
    -   Stateless Backend (mostly).
    -   Sticky Sessions (via Nginx) or Redis Adapter for Socket.io to support multiple server instances.
-   **Testing Strategy**:
    -   **Unit**: 100% coverage on `game-core` (Rules/FSM).
    -   **Integration**: Test Backend API + Database.
    -   **E2E**: Simulate 4 clients playing a full game via WebSocket scripts.
-   **Modularity**:
    -   New card types (e.g., Wild Cards) only need updates in `game-core`.
    -   New UI themes only affect `frontend`.
    -   New matchmaking algorithms only affect `backend`.

## 5. Implementation Roadmap (Refined)

1.  **Refactor**: Extract `frontend/src/rules` & `engine` to `packages/game-core`.
2.  **Backend Core**: Implement Auth & Room management.
3.  **Game Integration**: Connect Backend to `game-core` FSM.
4.  **WebSocket**: Implement real-time event loop.
5.  **Data**: Implement MySQL persistence & Redis caching.
6.  **Polish**: Add Replay & AI Debugging.
