# Dou Dizhu Backend Server

The backend service for the Dou Dizhu multiplayer card game, built with **NestJS**, **Socket.io**, and **Redis**.

## 🏗 Architecture

- **Framework**: NestJS (Modular, Dependency Injection)
- **Transport**: WebSocket (Socket.io) via `GameGateway`
- **Game Engine**: Finite State Machine (FSM) in `src/game/engine/`
- **Persistence**: Redis for game state snapshots and recovery
- **Multi-Room**: `GameManagerService` manages isolated game contexts

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Redis (v6+)
- MySQL (v8+)

### Installation

```bash
cd backend
npm install
```

### Configuration

Create a `.env` file in the `backend` directory:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=doudizhu

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# App
PORT=3000
```

### Running the Server

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

The server will start on `http://localhost:3000` (HTTP) and `ws://localhost:3000` (WebSocket).

## 🧪 Testing

### Unit Tests
Run standard Jest unit tests:
```bash
npm test
```

### E2E Verification
Run the automated game verification script (simulates 2 players):
```bash
npx ts-node scripts/verify-game.ts
```

### QA Automation
Run the Python-based QA verification script:
```bash
python3 ../tests/qa_verification.py
```

## 🔌 WebSocket API

**Namespace**: `/game`

### Client -> Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{ roomId: string, playerId: string }` | Join a game room. Creates room if not exists. |
| `client_action` | `{ type: string, payload: any }` | Send game action (e.g., `PLAY_CARDS`). |

### Server -> Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `sync_state` | `GameState` object | Full game state update (sanitized for Fog of War). |
| `exception` | `{ message: string }` | Error notification. |

## 📂 Directory Structure

```
src/
├── game/
│   ├── engine/           # State Machine (Init, Dealing, Playing)
│   ├── gateway/          # WebSocket Gateway
│   ├── services/         # Redis, GameManager, Serializer
│   └── types/            # TypeScript Interfaces
├── main.ts               # Entry point
└── app.module.ts         # Root module
```
