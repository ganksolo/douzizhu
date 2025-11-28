# Dou Dizhu - Monorepo

This is a Monorepo project for the Dou Dizhu (斗地主 / Fight the Landlord) card game, structured for frontend/backend separation.

## 📁 Project Structure

```
doudizhu/
├── frontend/          # React + TypeScript frontend
│   ├── src/          # Source code
│   ├── public/       # Static assets
│   └── ...           # Config files
├── backend/          # Future backend (Node.js/Express)
├── docs/             # Technical documentation
├── task.md           # Project task tracking
└── README.md         # This file
```

## 🚀 Quick Start

### Frontend Development

```bash
cd frontend
npm install    # First time only
npm run dev    # Start dev server
```

The frontend will be available at `http://localhost:5173`

### Backend Development (Coming Soon)

```bash
cd backend
# Backend setup commands (to be added)
```

## 📚 Documentation

- **User Guide**: See [frontend/README.md](./frontend/README.md)
- **Architecture Docs**: See [docs/README.md](./docs/README.md)
  - [Phase 11: State Machine & Event Bus](./docs/PHASE11_ARCHITECTURE.md)
  - [Phase 12: Pure Functional Rules Engine](./docs/PHASE12_RULES_ENGINE.md)

## 🏗 Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Vitest (testing)

### Backend (Planned)
- Node.js
- Express (or similar)
- WebSocket (for multiplayer)
- Database (TBD)

## 📝 Development Workflow

### Task Tracking
See [task.md](./task.md) for detailed task breakdown and progress tracking.

### Testing
```bash
cd frontend
npm test        # Run all tests
npm run test:ui # Open Vitest UI
```

### Building
```bash
cd frontend
npm run build   # Production build
```

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details
