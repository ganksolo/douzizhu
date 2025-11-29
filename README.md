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

### Backend Development
 
```bash
cd backend
npm install
npm run start:dev
```
 
See [backend/README.md](./backend/README.md) for detailed setup and API documentation.
 
## 📚 Documentation
 
- **Frontend Guide**: [frontend/README.md](./frontend/README.md)
- **Backend Guide**: [backend/README.md](./backend/README.md)
- **Architecture**: [docs/README.md](./docs/README.md)
  - [Phase 11: State Machine](./docs/PHASE11_ARCHITECTURE.md)
  - [Phase 15: Backend Engine](./docs/backend_test_plan.md)
 
## 🏗 Tech Stack
 
### Frontend
- React 19, TypeScript, Vite
- Tailwind CSS, Framer Motion
 
### Backend
- NestJS (Node.js)
- Socket.io (WebSocket)
- Redis (State Persistence)
- MySQL (User Data)

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
