# Task: 4-Player Dou Dizhu

- [x] Project Initialization <!-- id: 0 -->
    - [x] Initialize Vite + React + TypeScript project <!-- id: 1 -->
    - [x] Install and configure Tailwind CSS <!-- id: 2 -->
- [x] Core Data Models (`types.ts`) <!-- id: 3 -->
    - [x] Define `Suit` and `Rank` <!-- id: 4 -->
    - [x] Define `Card` interface <!-- id: 5 -->
    - [x] Define `Player` interface <!-- id: 6 -->
- [x] Poker Engine (`deck.ts`) <!-- id: 7 -->
    - [x] Implement `createDeck` (108 cards) <!-- id: 8 -->
    - [x] Implement `shuffleDeck` (Fisher-Yates) <!-- id: 9 -->
    - [x] Implement `dealCards` (4 players, 8 bottom cards) <!-- id: 10 -->
- [x] Basic UI (`App.tsx`) <!-- id: 11 -->
    - [x] Display player hand counts <!-- id: 12 -->
    - [x] Display bottom cards <!-- id: 13 -->
- [x] Phase 2: Game Logic (`rules.ts`) <!-- id: 14 -->
    - [x] Define `HandType` enum <!-- id: 15 -->
    - [x] Implement `getHandType` (Single, Pair, Triple, Straight, Bomb, Rocket, etc.) <!-- id: 16 -->
    - [x] Implement `getHandValue` (Weight calculation) <!-- id: 17 -->
    - [x] Implement `canBeat` (Comparison logic) <!-- id: 18 -->
    - [x] Add test buttons in `App.tsx` <!-- id: 19 -->
- [x] Phase 3: Game UI & Interaction <!-- id: 20 -->
    - [x] Create `Card` component (Visuals, Selection state) <!-- id: 21 -->
    - [x] Create `PlayerHand` component (Layout, Interaction) <!-- id: 22 -->
    - [x] Create `GameTable` component (4-player layout, Center area) <!-- id: 23 -->
    - [x] Implement State Management (Turn, Last Played) <!-- id: 24 -->
    - [x] Implement "Play" & "Pass" logic with validation <!-- id: 25 -->
- [x] Phase 4: Game Flow Refinement <!-- id: 26 -->
    - [x] Update `types.ts` with `GamePhase` <!-- id: 27 -->
    - [x] Create `useGameLoop` hook <!-- id: 28 -->
        - [x] Implement State (Phase, Bidding, Pass Count) <!-- id: 29 -->
        - [x] Implement Bidding Logic <!-- id: 30 -->
        - [x] Implement Turn Flow (Pass Count check) <!-- id: 31 -->
        - [x] Implement Win Condition <!-- id: 32 -->
    - [x] Update `GameTable` to use `useGameLoop` <!-- id: 33 -->
    - [x] Add UI for Bidding and Game Over <!-- id: 34 -->
- [x] Phase 5: Rule-based AI <!-- id: 35 -->
    - [x] Create `ai.ts` with decision logic <!-- id: 36 -->
        - [x] Implement `findMoves` (Find valid hands to beat target) <!-- id: 37 -->
        - [x] Implement `aiAction` (Lead vs Follow logic) <!-- id: 38 -->
    - [x] Integrate AI into `useGameLoop` <!-- id: 39 -->
- [x] Phase 6: Visual Polish & Animation <!-- id: 40 -->
    - [x] Install `framer-motion` and `lucide-react` <!-- id: 41 -->
    - [x] Enhance `Card` component (Styles, Animations) <!-- id: 42 -->
    - [x] Enhance `GameTable` UI (Background, Player Highlight, Icons) <!-- id: 43 -->
    - [x] Create `GameOverModal` with animations <!-- id: 44 -->

- [x] Phase 7: Immersive Animations & Sound <!-- id: 45 -->
    - [x] Create `SoundManager` (utils/sound.ts) <!-- id: 46 -->
    - [x] Implement Shuffling & Dealing Animation <!-- id: 47 -->
    - [x] Implement Play Card Animation (Scale/Fly) <!-- id: 48 -->
    - [x] Add Turn Indicator (Breathing Light) <!-- id: 49 -->
    - [x] Download and integrate sound assets <!-- id: 50 -->

- [x] Phase 8: Advanced Interaction & Theming <!-- id: 51 -->
    - [x] Implement Drag-to-Select in `PlayerHand` <!-- id: 52 -->
    - [x] Implement Smart Hint System (`findBestMove`) <!-- id: 53 -->
    - [x] Implement Theme System (Classic, Tech, Wood) <!-- id: 54 -->
    - [x] Add Settings Menu for Theme Switching <!-- id: 55 -->


- [x] Fix 1: Spatial Layout - Separate Play Areas <!-- id: 56 -->
    - [x] Create 4 play area containers (Bottom, Right, Top, Left) <!-- id: 57 -->
    - [x] Map playerId to position and render cards accordingly <!-- id: 58 -->
    - [x] Ensure old cards clear when new player plays <!-- id: 59 -->

- [x] Fix 2: Replace Alert with Toast/Dialog System <!-- id: 60 -->
    - [x] Create Toast component and useToast hook <!-- id: 61 -->
    - [x] Create GameDialog component <!-- id: 62 -->
    - [x] Replace all alert() calls <!-- id: 63 -->
    - [x] Update documentation <!-- id: 64 -->

- [x] Fix 3: Sound Preloading & Autoplay <!-- id: 65 -->
    - [x] Enhance SoundManager with proper preloading <!-- id: 66 -->
    - [x] QA: Regression test full game flow with 4 players (1 human + 3 bots). <!-- id: 16 -->
    - [x] Tri-Source Verification (FE/BE/Contract) <!-- id: 17 -->
    - [x] Update `backend_test_registry.md` <!-- id: 18 -->
    - [x] Add initialize() method for autoplay policy <!-- id: 67 -->
    - [x] Create SoundToggle button component <!-- id: 68 -->
    - [x] Update documentation <!-- id: 69 -->

- [x] Phase 9: AI Strategy Upgrade & Debugging <!-- id: 70 -->
    - [x] Rewrite aiAction with advanced heuristics <!-- id: 71 -->
      - [x] Bomb preservation logic <!-- id: 72 -->
      - [x] Peasant cooperation strategy <!-- id: 73 -->
      - [x] Endgame aggressive mode <!-- id: 74 -->
    - [x] Add auto-play functionality for player <!-- id: 75 -->
    - [x] Create DebugOverlay component <!-- id: 76 -->
      - [x] Show AI hands (face-up) <!-- id: 77 -->
      - [x] Display AI reasoning logs <!-- id: 78 -->
      - [x] Show hand evaluation scores <!-- id: 79 -->
    - [x] Update documentation <!-- id: 80 -->
    - [x] Update documentation <!-- id: 80 -->

- [x] Fix 4: UI/UX Polish - Hand Interaction & Animation <!-- id: 90 -->
    - [x] Implement `resetHandSelection` logic <!-- id: 91 -->
      - [x] Reset on Pass <!-- id: 92 -->
      - [x] Reset on Play <!-- id: 93 -->
      - [x] Reset before Hint <!-- id: 94 -->
    - [x] Fix Card Hover Animation <!-- id: 95 -->
      - [x] Remove scaling, use translateY <!-- id: 96 -->
      - [x] Add smooth transitions <!-- id: 97 -->
      - [x] Prevent layout overflow <!-- id: 98 -->

- [x] Phase 10: Scoring System & Persistence <!-- id: 81 -->
    - [x] Implement ScoreManager (utils/score.ts) <!-- id: 82 -->
    - [x] Update useGameLoop for score tracking <!-- id: 83 -->
      - [x] Track multipliers (bombs, rockets) <!-- id: 84 -->
      - [x] Detect Spring / Anti-Spring <!-- id: 85 -->
      - [x] Calculate final scores <!-- id: 86 -->
    - [x] Implement Data Persistence (localStorage) <!-- id: 87 -->
    - [x] Create ResultModal with visual effects <!-- id: 88 -->
    - [x] Update documentation <!-- id: 89 -->

- [x] Fix 5: Smart Hint System <!-- id: 90 -->
    - [x] Fix `getHint` argument bug in `GameTable.tsx` <!-- id: 91 -->
    - [x] Enhance `getHint` in `ai.ts` to prioritize complex hands (Straights, Triples, Pairs) during free play <!-- id: 92 -->

- [/] Phase 11: State Machine & Event Bus Architecture (v2.0) <!-- id: 100 -->
    - [x] Core Infrastructure <!-- id: 101 -->
        - [x] EventBus implementation <!-- id: 102 -->
        - [x] GameStateEnum definition <!-- id: 103 -->
        - [x] GameAction types <!-- id: 104 -->
    - [x] State Machine System <!-- id: 105 -->
        - [x] BaseState abstract class <!-- id: 106 -->
        - [x] GameContext state manager <!-- id: 107 -->
        - [x] StateFactory <!-- id: 108 -->
    - [x] Concrete State Implementations <!-- id: 109 -->
        - [x] InitState <!-- id: 110 -->
        - [x] ShufflingState <!-- id: 111 -->
        - [x] DealingState <!-- id: 112 -->
        - [x] CallLandlordState <!-- id: 113 -->
        - [x] ShowBottomState <!-- id: 114 -->
        - [x] PlayingState <!-- id: 115 -->
        - [x] RoundEndState <!-- id: 116 -->
    - [x] React Integration <!-- id: 117 -->
        - [x] useGameEngine hook <!-- id: 118 -->
        - [x] Demo component <!-- id: 119 -->
        - [ ] Migrate GameTable (future) <!-- id: 120 -->

- [x] Phase 12: Pure Functional Rules Engine <!-- id: 130 -->
    - [x] Core Type System <!-- id: 131 -->
        - [x] HandType enum <!-- id: 132 -->
        - [x] AnalysisResult interface <!-- id: 133 -->
    - [x] Pattern Detection <!-- id: 134 -->
        - [x] PatternDetector.analyze() <!-- id: 135 -->
        - [x] Single/Pair/Trio detection <!-- id: 136 -->
        - [x] Chain detection <!-- id: 137 -->
        - [x] Airplane detection <!-- id: 138 -->
    - [x] Validation & Comparison <!-- id: 139 -->
        - [x] MoveValidator <!-- id: 140 -->
        - [x] MoveComparator <!-- id: 141 -->
    - [x] Testing <!-- id: 142 -->
        - [x] PatternDetector tests <!-- id: 143 -->
        - [x] MoveComparator tests <!-- id: 144 -->

- [x] Phase 13: Monorepo Restructure <!-- id: 150 -->
    - [x] Create directory structure <!-- id: 151 -->
    - [x] Move frontend files <!-- id: 152 -->
    - [x] Create backend placeholder <!-- id: 153 -->
    - [x] Update root documentation <!-- id: 154 -->
    - [x] Verify frontend build <!-- id: 155 -->

- [/] Phase 14: Backend Development <!-- id: 160 -->
    - [x] Infrastructure Setup <!-- id: 161 -->
        - [x] Initialize NestJS project <!-- id: 162 -->
        - [x] Setup MySQL database connection <!-- id: 163 -->
        - [x] Setup Redis connection <!-- id: 164 -->
        - [x] Configure environment variables <!-- id: 165 -->
        - [x] Test database connections <!-- id: 166 -->
    - [ ] Authentication System <!-- id: 166 -->
        - [ ] Implement JWT authentication <!-- id: 167 -->
        - [ ] User registration endpoint <!-- id: 168 -->
        - [ ] User login endpoint <!-- id: 169 -->
        - [ ] Token refresh endpoint <!-- id: 170 -->
    - [ ] User Management <!-- id: 171 -->
        - [ ] User profile endpoints <!-- id: 172 -->
        - [ ] Stats tracking system <!-- id: 173 -->
        - [ ] Match history persistence <!-- id: 174 -->
    - [ ] Room Management <!-- id: 175 -->
        - [ ] Create/list/join/leave room endpoints <!-- id: 176 -->
        - [ ] Room state management <!-- id: 177 -->
        - [ ] Private room password system <!-- id: 178 -->
    - [ ] Game Session Management <!-- id: 179 -->
        - [ ] Game start/state endpoints <!-- id: 180 -->
        - [ ] Server-side game validation <!-- id: 181 -->
        - [ ] Game history tracking <!-- id: 182 -->
    - [ ] WebSocket Implementation <!-- id: 183 -->
        - [ ] Setup Socket.io server <!-- id: 184 -->
        - [ ] Real-time room updates <!-- id: 185 -->
        - [ ] Real-time gameplay events <!-- id: 186 -->
        - [ ] Error handling and reconnection <!-- id: 187 -->
    - [ ] Leaderboard & Stats <!-- id: 188 -->
        - [ ] Leaderboard calculation <!-- id: 189 -->
        - [ ] Stats aggregation <!-- id: 190 -->
        - [ ] Match history endpoints <!-- id: 191 -->
    - [ ] Testing & Security <!-- id: 192 -->
        - [ ] API integration tests <!-- id: 193 -->
        - [ ] Rate limiting implementation <!-- id: 194 -->
        - [ ] Security audit <!-- id: 195 -->
        - [ ] Load testing <!-- id: 196 -->

- [x] Phase 15: Backend Game Engine Core <!-- id: 200 -->
    - [x] State Machine Skeleton <!-- id: 201 -->
        - [x] Define BaseState and GameContext <!-- id: 202 -->
        - [x] Implement Init, Dealing, Playing states <!-- id: 203 -->
        - [x] Setup GameModule with Dependency Injection <!-- id: 204 -->

    - [x] Redis Persistence Integration <!-- id: 205 -->
        - [x] Design Redis Hash structure <!-- id: 206 -->
        - [x] Implement GameRedisService <!-- id: 207 -->
        - [x] Update GameContext with save/load logic <!-- id: 208 -->

    - [x] Network Layer & Fog of War <!-- id: 209 -->
        - [x] Implement StateSerializer (Data Sanitization) <!-- id: 210 -->
        - [x] Implement GameGateway (WebSocket) <!-- id: 211 -->
        - [x] Integrate State Restoration & Broadcast Loop <!-- id: 212 -->

    - [x] Bug Fixes & Architecture Improvements <!-- id: 213 -->
        - [x] Implement GameManagerService for multi-room support <!-- id: 214 -->
        - [x] Fix state initialization timing issue <!-- id: 215 -->
    
    - [x] Documentation Update <!-- id: 216 -->
        - [x] Create backend/README.md <!-- id: 217 -->
        - [x] Update root README.md <!-- id: 218 -->

- [x] Phase 16: Backend Rules Engine (4-Player) <!-- id: 219 -->
    - [x] Phase 16.1: Types & Pattern Recognition <!-- id: 220 -->
        - [x] Define Card Ranks & Pattern Types (Bomb Grading) <!-- id: 221 -->
        - [x] Implement PatternDetector (Rocket, Bombs, Sequences) <!-- id: 222 -->
        - [x] Unit Tests for Pattern Recognition <!-- id: 223 -->
    - [x] Phase 16.2: Comparison Logic & Validation <!-- id: 224 -->
        - [x] Implement MoveComparator (Rocket > Bomb > Normal) <!-- id: 225 -->
        - [x] Implement MoveValidator (Anti-cheat, Turn Rules) <!-- id: 226 -->
        - [x] Unit Tests for Comparator & Validator <!-- id: 227 -->
    - [x] Phase 16.3: Service Encapsulation & Testing <!-- id: 228 -->
        - [x] Implement RulesService (Facade) <!-- id: 229 -->
        - [x] Create rules.spec.ts (Covering 4-player edge cases) <!-- id: 230 -->

- [x] Phase 17: AI Core (Backend) <!-- id: 231 -->
    - [x] Phase 17.1: Heuristics & Strategy Model <!-- id: 232 -->
        - [x] Define AI Interfaces (HeuristicResult, StrategyProfile) <!-- id: 233 -->
        - [x] Implement HeuristicEvaluator (Bomb, Control, Smoothness) <!-- id: 234 -->
        - [x] Implement StrategyModel (Early/Mid/Late Game Logic) <!-- id: 235 -->
    - [x] Phase 17.2: Decision Engine (Redo) <!-- id: 236 -->
        - [x] Implement AIExplain Interface <!-- id: 237 -->
        - [x] Implement Decision Pipeline (Detect -> Filter -> Rank -> Weigh) <!-- id: 238 -->
        - [x] Implement Strategy Weighing (Early/Late/Bomb Logic) <!-- id: 239 -->
        - [x] Create QA Handoff (Priority Logic List) <!-- id: 240 -->
    - [x] Phase 17.3: AI Service Integration <!-- id: 241 -->
        - [x] Implement AIService (NestJS Wrapper) <!-- id: 242 -->
        - [x] Integrate into PlayingState (Auto-play loop) <!-- id: 243 -->
        - [x] Create QA Handoff (Sequence Diagram) <!-- id: 244 -->

- [x] Phase 18: Security & Robustness <!-- id: 250 -->
    - [x] Phase 18.1: Action Pipeline <!-- id: 251 -->
        - [x] Implement InputNormalizer (Sanitization) <!-- id: 252 -->
        - [x] Implement Identity Binding (Anti-spoofing) <!-- id: 253 -->
        - [x] Implement Payload Validation (Size limits, Format check) <!-- id: 254 -->
    - [x] Phase 18.2: Turn Management & Action Handlers <!-- id: 255 -->
        - [x] Implement TurnManager (Next Turn, Pass Logic, Round End) <!-- id: 256 -->
        - [x] Implement PlayActionHandler (Validation & Execution) <!-- id: 257 -->
        - [x] Implement PassActionHandler (Pass Logic) <!-- id: 258 -->
        - [x] Create QA Handoff (Turn Flow Scenarios) <!-- id: 259 -->
    - [x] Phase 18.3: Integration, Persistence & Broadcasting <!-- id: 260 -->
        - [x] Implement ActionPipelineService.execute() (Complete Pipeline) <!-- id: 261 -->
        - [x] Integrate Redis Distributed Locks (Concurrency Control) <!-- id: 262 -->
        - [x] Implement Atomic Redis Writes (State Persistence) <!-- id: 263 -->
        - [x] Integrate with GameGateway (WebSocket Layer) <!-- id: 264 -->
        - [x] Implement Error Handling & Rollback Strategy <!-- id: 265 -->
        - [x] Create QA Handoff (E2E Action Flow with Sequence Diagram) <!-- id: 266 -->

- [x] Phase 19: Match History & Statistics <!-- id: 270 -->
    - [x] Phase 19.1: Data Persistence Foundation <!-- id: 271 -->
        - [x] Design match_record table schema (MySQL) <!-- id: 272 -->
        - [x] Create match.types.ts (PlayerSnapshot, MatchResultData) <!-- id: 273 -->
        - [x] Implement match.entity.ts (TypeORM Entity with JSON columns) <!-- id: 274 -->
        - [x] Implement match.repository.ts (CRUD + JSON queries) <!-- id: 275 -->
        - [x] Create QA Handoff (Schema Verification Checklist) <!-- id: 276 -->

    - [x] Phase 19.2: Settlement Logic & State Machine Integration <!-- id: 277 -->
        - [x] Update RoomData with actionHistory and startTime <!-- id: 278 -->
        - [x] Implement MatchService.saveMatchResult() (Data Transformation) <!-- id: 279 -->
        - [x] Implement GameEndState (Async Persistence Trigger) <!-- id: 280 -->
        - [x] Integrate PlayActionHandler -> GameEndState transition <!-- id: 281 -->
        - [x] Create QA Handoff (Data Mapping Table) <!-- id: 282 -->

    - [x] Phase 19.3: API & Tests <!-- id: 283 -->
        - [x] Implement MatchController (GET /matches/player/:id, GET /matches/:id) <!-- id: 284 -->
        - [x] Create Unit Tests for MatchService (Mock Repository) <!-- id: 285 -->
        - [x] Create Unit Tests for MatchRepository (JSON Serialization) <!-- id: 286 -->
        - [x] Create QA Handoff (API Response Examples) <!-- id: 287 -->

- [x] Phase 20: User System & Statistics <!-- id: 290 -->
    - [x] Phase 20.1: User Infrastructure <!-- id: 291 -->
        - [x] Create UserEntity (id, nickname, avatar, auth_type) <!-- id: 292 -->
        - [x] Implement UserRepository (CRUD) <!-- id: 293 -->
        - [x] Implement UserService (createGuest, findById) <!-- id: 294 -->
        - [x] Create QA Handoff (SQL Schema) <!-- id: 295 -->

    - [x] Phase 20.2: Authentication & JWT <!-- id: 296 -->
        - [x] Install dependencies (@nestjs/jwt, passport) <!-- id: 297 -->
        - [x] Implement AuthService (guestLogin, JWT generation) <!-- id: 298 -->
        - [x] Implement JwtStrategy & AuthGuard <!-- id: 299 -->
        - [x] Implement AuthController (POST /auth/guest-login) <!-- id: 300 -->
        - [x] Create QA Handoff (Login Response Example) <!-- id: 301 -->

    - [x] Phase 20.3: System Integration <!-- id: 302 -->
        - [x] Update GameGateway (Handle Connection Auth) <!-- id: 303 -->
        - [x] Update UserService (Inject MatchRepository, Aggregate Stats) <!-- id: 304 -->
        - [x] Implement UserController (GET /user/:id/stats) <!-- id: 305 -->
        - [x] Create QA Handoff (Socket Auth & Stats) <!-- id: 306 -->

- [x] Phase 21: Room Management & Gameplay Enhancements <!-- id: 307 -->
    - [x] Phase 21.1: Room Core & Redis Upgrade <!-- id: 308 -->
        - [x] Create RoomModule/Service/Gateway <!-- id: 309 -->
        - [x] Implement Redis Schema (room:meta, room:players) <!-- id: 310 -->
        - [x] Implement Join/Leave/Kick Logic <!-- id: 311 -->
        - [x] Fix: Switch to manual ioredis instantiation (RoomService) <!-- id: 311-fix -->
        - [x] Create QA Handoff (Redis Structure) <!-- id: 312 -->

    - [x] Phase 21.2: Ready System & Game Start <!-- id: 313 -->
        - [x] Implement toggleReady & requestRematch <!-- id: 314 -->
        - [x] Implement tryStartGame (Trigger Game Engine) <!-- id: 315 -->
        - [x] Update RoomGateway (Events) <!-- id: 316 -->
        - [x] Create QA Handoff (Start Flow) <!-- id: 317 -->

    - [x] Phase 21.3: Reconnection & AFK Handling <!-- id: 318 -->
        - [x] Implement ReconnectService (Disconnect/Reconnect Logic) <!-- id: 319 -->
        - [x] Implement AFKService (Activity Tracking & Auto-Kick) <!-- id: 320 -->
        - [x] Implement RoomCleanerService (Abandoned Room Cleanup) <!-- id: 321 -->
        - [x] Integrate into GameGateway (Disconnect/Reconnect Hooks) <!-- id: 322 -->
        - [x] Create QA Handoff (Reconnection Flow & Test Cases) <!-- id: 323 -->

- [x] Phase 22: Frontend Integration <!-- id: 324 -->
    - [x] Phase 22.1: Infrastructure & State Management <!-- id: 325 -->
        - [x] Install dependencies (axios, socket.io-client, zustand) <!-- id: 326 -->
        - [x] Create API Client (services/api.ts) <!-- id: 327 -->
        - [x] Create Socket Manager (services/socket.ts) <!-- id: 328 -->
        - [x] Create Auth Store (store/auth.store.ts) <!-- id: 329 -->
        - [x] Create Room Store (store/room.store.ts) <!-- id: 330 -->
        - [x] Add browser test utility for console debugging <!-- id: 331 -->
        - [x] Manual verification (API, Socket, Stores) <!-- id: 332 -->
        - [x] Create QA handoff documentation <!-- id: 333 -->

    - [x] Phase 22.2: UI Pages & Event Wiring <!-- id: 334 -->
        - [x] Implement App.tsx (Routing & AuthGuard) <!-- id: 335 -->
        - [x] Implement LoginPage.tsx (Guest Login) <!-- id: 336 -->
        - [x] Implement RoomPage.tsx (Lobby UI & Socket Events) <!-- id: 337 -->
        - [x] Verify "Login -> Join -> Ready -> Game Start" flow <!-- id: 338 -->
        - [x] Update walkthrough.md with Frontend Engineering Facts <!-- id: 339 -->

    - [x] Phase 22.3: Lobby System & Routing <!-- id: 340 -->
        - [x] Extend api.ts with room.list() and room.create() <!-- id: 341 -->
        - [x] Create lobby.store.ts (room list state management) <!-- id: 342 -->
        - [x] Update App.tsx (add /lobby route) <!-- id: 343 -->
        - [x] Update LoginPage.tsx (redirect to /lobby) <!-- id: 344 -->
        - [x] Create LobbyPage.tsx (room list + create buttons) <!-- id: 345 -->
        - [x] Verify lobby flow: Login -> Lobby -> Create/Join Room <!-- id: 346 -->

- [x] Phase 22.4: API Contract Fixes (Issue #3) <!-- id: 350 -->
    - [x] Update api_spec.md with PvE params (type, difficulty, botCount) <!-- id: 351 -->
    - [x] Update openapi.yaml with PvE schema <!-- id: 352 -->
    - [x] Phase 22.4: Room Enhancements (AI & Layout) <!-- id: 347 -->
        - [x] Update room.store.ts (isBot field, roomConfig) <!-- id: 348 -->
        - [x] Update RoomPage.tsx (AI differentiation, ready status) <!-- id: 349 -->
        - [x] Implement spatial layout (Bottom/Right/Top/Left) <!-- id: 350 -->
        - [x] Verify PvE flow (AI Ready -> Game Start) <!-- id: 351 -->
        - [ ] **QA Verification (Tri-Source)** <!-- id: 352 -->
            - [ ] Frontend Facts: ❌ BLOCKED (See Issue #2) <!-- id: 353 -->
            - [ ] API Contract: ❌ BLOCKED (See Issue #3) <!-- id: 354 -->

- [x] Fix 6: Resolve Issue #8 (Missing Lobby Documentation) <!-- id: 355 -->
    - [x] Append Phase 22 to walkthrough.md <!-- id: 356 -->

- [x] Phase 22.5: Frontend Upgrade: 4-Player UI <!-- id: 22.5 -->
  - [x] RoomPage 4-Player Layout (Cross/Corner) <!-- id: 22.5.1 -->
  - [x] Relative Seat Mapping Algo (Bottom/Right/Top/Left) <!-- id: 22.5.2 -->
  - [x] GameBoard 4-Player Adapt (HandCards, TableArea) <!-- id: 22.5.3 -->
  - [x] AI Indicators & Ready Logic <!-- id: 22.5.4 -->

- [x] Phase 22.6: Backend Upgrade: 4-Player Core (PVP + PVE) <!-- id: 22.6 -->
  - [x] Seat System Refactor (room:{id}:seats, 0-3 index) <!-- id: 22.6.1 -->
  - [x] PvE Mode (AI Auto-fill in tryStartGame) <!-- id: 22.6.2 -->
  - [x] 4-Player Dealing (2 Decks, 108 Cards, Bottom 8) <!-- id: 22.6.3 -->
  - [x] PlayingState & Scoring Update (Turn Mod 4, 1L vs 3P) <!-- id: 22.6.4 -->
  - [x] Documentation (Micro-doc & API Update) <!-- id: 22.6.5 -->
    - [x] QA Handoff Generation <!-- id: 366 -->

- [ ] Phase 23.1: Frontend GameBoard Data Mapping <!-- id: 23.1 -->
  - [x] Create game.store.ts (State: gameState, currentTurn, etc.) <!-- id: 23.1.1 -->
  - [x] Implement Relative Seat Mapping (Bottom/Right/Top/Left) <!-- id: 23.1.2 -->
  - [x] Implement sync_state Action & Socket Listener <!-- id: 23.1.3 -->
  - [x] Create DebugStatePanel Component <!-- id: 23.1.4 -->
  - [x] **QA Verification (Tri-Source)** <!-- id: 23.1.5 -->

- [x] Phase 23.2: Frontend GameBoard Layout & Components <!-- id: 23.2 -->
  - [x] Create Card Component (Basic CSS) <!-- id: 23.2.1 -->
  - [x] Create PlayerAvatar Component (Turn Indicator, HandCount) <!-- id: 23.2.2 -->
  - [x] Create GameBoard Container (Absolute Layout) <!-- id: 23.2.3 -->
  - [x] Implement Bottom Cards (Dipai) Area <!-- id: 23.2.4 -->
  - [x] Verify Game Start Transition <!-- id: 23.2.5 -->


- [x] Phase 23.3: Frontend GameBoard Dynamic Rendering <!-- id: 23.3 -->
  - [x] Update GameStore (Add `myHand`) <!-- id: 23.3.1 -->
  - [x] Implement My Hand Rendering (Selection, Sorting) <!-- id: 23.3.2 -->
  - [x] Implement Table Area (Last Played Visuals) <!-- id: 23.3.3 -->
  - [x] Implement Phase Indicators (Toast, Active Ring) <!-- id: 23.3.4 -->
  - [x] Verify PvE Visuals <!-- id: 23.3.5 -->

- [x] Phase 23.4: Backend Patch: Sync State Field Completion <!-- id: 23.4 -->
  - [x] Verify/Add seats.handCount <!-- id: 23.4.1 -->
  - [x] Verify/Add lastPlayed.seatIndex <!-- id: 23.4.2 -->
  - [x] Verify/Add bottomCards fog-of-war logic <!-- id: 23.4.3 -->

- [x] Phase 23.5: Fix Issue #7 (SyncState Mismatch) <!-- id: 23.5 -->
  - [x] Update Frontend GameStore to use lastPlayedCards <!-- id: 23.5.1 -->
  - [x] Update API Spec and WS Events md <!-- id: 23.5.2 -->
  - [x] Verify Backend StateSerializer (Keep lastPlayedCards) <!-- id: 23.5.3 -->
  - [x] Fix Syntax Error in DebugStatePanel.tsx <!-- id: 23.5.4 -->
  - [ ] Regression Test: Verify GameBoard UI (LastPlayedCards) <!-- id: 23.5.5 -->

- [x] Phase 24: REST API Implementation (Fix Issue #9) <!-- id: 24 -->
  - [x] Implement RoomService search & pagination <!-- id: 24.1 -->
  - [x] Implement RoomController (GET/POST) <!-- id: 24.2 -->
  - [x] Update RoomGateway (Signature Fix) <!-- id: 24.3 -->
  - [x] Verify API with curl/Postman <!-- id: 24.4 -->

- [x] Fix 7: Resolve Issue #12 (RoomController Contract) <!-- id: 370 -->
    - [x] Wrap getRooms response in ApiResponse <!-- id: 371 -->
    - [x] Wrap getRoom response in ApiResponse <!-- id: 372 -->

- [x] Fix 8: Resolve Issue #13 (Pagination Contract) <!-- id: 380 -->
    - [x] Add pagination object to getRooms response <!-- id: 381 -->
    - [x] Calculate totalPages <!-- id: 382 -->

- [x] Fix 9: Resolve Issue #14 (Room Object Format) <!-- id: 390 -->
    - [x] Flatten config fields (name, maxPlayers) <!-- id: 391 -->
    - [x] Map ownerId to hostId <!-- id: 392 -->

- [x] Fix 10: Resolve Issue #15 (LobbyPage Crash) <!-- id: 400 -->
    - [x] prevent crash on undefined room.name in LobbyPage <!-- id: 401 -->
    - [x] Fix RoomController.getRoom response format (backend) <!-- id: 402 -->
    - [x] Flush stale Redis data (backend) <!-- id: 403 -->

- [x] Fix 11: Resolve Issue #16 (Lobby hostId Crash) <!-- id: 410 -->

- [x] Phase 25: Frontend Authentication Implementation <!-- id: 420 -->
    - [x] Update API Client (api.ts) with auth endpoints <!-- id: 421 -->
    - [x] Update Auth Store (auth.store.ts) with login/register actions <!-- id: 422 -->
    - [x] Create RegisterPage.tsx with validation <!-- id: 423 -->
    - [x] Update LoginPage.tsx (Guest/Account tabs) <!-- id: 424 -->
    - [x] Update App.tsx routing <!-- id: 425 -->
    - [x] Implement useToast hook (Basic) <!-- id: 426 -->

- [x] Phase 26: User Authentication Logic (Bcrypt) <!-- id: 430 -->
    - [x] Install bcryptjs dependencies <!-- id: 431 -->
    - [x] Update AuthService: Hashed registration <!-- id: 432 -->
    - [x] Update AuthService: Secure login <!-- id: 433 -->
    - [x] Verify AuthController endpoints <!-- id: 434 -->

- [x] Phase 27: Room Seating & PVE Controls <!-- id: 440 -->
    - [x] Create PlayerSeat component <!-- id: 441 -->
    - [x] Update RoomPage with seating logic <!-- id: 442 -->
    - [x] Implement 'Add AI' button (emit add_bot) <!-- id: 443 -->
    - [x] Fix 'Unable to Sit' join logic <!-- id: 444 -->

- [x] **Phase 28: Seating Logic & Basic AI (Backend)**
  - [x] Refine `RoomService` to handle stable seating (0-3) and check fullness ([Fix RoomService Seating](#fix-11))
  - [x] Implement `leave_room` to clear position + handle owner transfer ([Fix Leave Room](#fix-11))
  - [x] `POST /rooms/:id/ai` endpoint -> specific service method `addBot` ([Add Bot API](#fix-11))
  - [x] Generate temp User for bot, auto-flag ready, emit `player_joined`
  - [x] Game Start Orchestration: `tryStartGame` checks if all ready (including bots) -> deal cards -> `game_start`
  - [x] Basic Bot Gameplay: Random valid move or pass (Implemented in `BotService` hooked to `GameGateway`)

- [x] **Phase 29: Gameplay Backend Integration (Socket + Redis)**
  - [x] Inject `RoomService` into `GameGateway`
  - [x] Refactor `handleJoinRoom` to use `RoomService` and emit events
  - [x] Implement `toggle_ready` listener in `GameGateway`
  - [x] Wire Up `RoomController` to emit events via `GameGateway` for Bots
  - [x] Verify Seat Rendering and Game Start flow) <!-- id: 455 -->

- [x] **Phase 30: Gameplay UI Polish**
  - [x] Universal "Sit Here" overlay for Observers (RoomPage)
  - [x] Verify Ready/Cancel Ready button state
- [ ] Phase 31: Game Loop UI Implementation <!-- id: 31 -->
  - [x] Create `GameControls` Component (Play, Pass, Hint) <!-- id: 31.1 -->
- [x] Refactor `GameBoard.tsx` to use `GameControls` and `PlayerHand` <!-- id: 31.2 -->
- [x] Integrate Visual Turn Indicators (Timer, Highlight) <!-- id: 31.3 -->
- [ ] Verify Frontend Interactions (Card Selection, Button States) <!-- id: 31.4 -->

- [x] Match Phase 32: Backend Game Loop Verification & Contract Fixes <!-- id: 32 -->
  - [x] Update api_spec.md (Client Action Funnel) <!-- id: 32.1 -->
  - [x] Harden play-handler.ts (Payload Validation) <!-- id: 32.2 -->
  - [x] Enhance input-normalizer.ts <!-- id: 32.3 -->
  - [x] Implement verify_game_loop.ts script <!-- id: 32.4 -->
  - [x] Execute Verification Script <!-- id: 32.5 -->
- [x] Phase 33: PVE UI Debugging & Polish <!-- id: 33 -->
  - [x] Fix PVE/Empty Seat Check (RoomPage.tsx) <!-- id: 33.1 -->
  - [x] Debug "Ready" Button (Logging & Logic) <!-- id: 33.2 -->
  - [x] Verify Auto-Start Render Trigger <!-- id: 33.3 -->
  - [x] Verify addBot Broadcast (Backend) <!-- id: 33.4 -->
  - [x] Fix RoomController.addBot Event Emission <!-- id: 33.5 -->
  - [x] Verify PVE Game Start Flow <!-- id: 33.6 -->
- [x] Phase 34: Enable 4-Player Support (Frontend) <!-- id: 34 -->
  - [x] Update RoomPage.tsx Limit Logic <!-- id: 34.1 -->
  - [x] Verify Layout/Position Logic <!-- id: 34.2 -->
  - [x] Verify "Add AI" behavior for 4th player <!-- id: 34.3 -->
- [x] Phase 35: PVE Auto-Fill and Auto-Start <!-- id: 35 -->
  - [x] Fix PVE Room Type Display (RoomPage.tsx) <!-- id: 35.1 -->
  - [x] Implement PVE Auto-Fill Logic (room.service.ts) <!-- id: 35.2 -->
  - [x] Broadcast Bot Join Events (game.gateway.ts) <!-- id: 35.3 -->
  - [x] Implement Auto-Start Logic (room.service.ts) <!-- id: 35.4 -->
  - [x] Verify Avatar/Username Consistency <!-- id: 35.5 -->
  - [x] Browser Testing and Verification <!-- id: 35.6 -->
- [ ] Phase 36: Frontend Gameplay UI State Integration <!-- id: 36 -->
  - [x] Review & Enhance game.store.ts <!-- id: 36.1 -->
  - [x] Implement sync_state Listener (GamePage) <!-- id: 36.2 -->
  - [x] Render Player Hands <!-- id: 36.3 -->
  - [x] Render Last Played Cards (Table) <!-- id: 36.4 -->
  - [x] Implement Turn Indicator <!-- id: 36.5 -->
  - [x] Integrate Game Controls <!-- id: 36.6 -->
  - [x] Browser Testing & Verification <!-- id: 36.7 -->
  - [x] Fix RoomPage Auto-Sit Issue <!-- id: 36.8 -->
- [x] Phase 37: GitHub Issue #18 - Fill All Empty Seats with Bots (Backend) <!-- id: 37 -->
  - [x] Implement fillBotsToRoom in RoomService <!-- id: 37.1 -->
  - [x] Add /rooms/:id/fill-bots endpoint in RoomController <!-- id: 37.2 -->
  - [x] Update api_spec.md documentation <!-- id: 37.3 -->
  - [x] Update openapi.yaml documentation (API Dual-Write) <!-- id: 37.4 -->
  - [x] Create verification script <!-- id: 37.5 -->
  - [x] Execute verification and confirm success <!-- id: 37.6 -->
- [ ] Phase 38: GitHub Issue #18 - Fill All Empty Seats (Frontend) <!-- id: 38 -->
  - [x] Add fillBots API method in api.ts <!-- id: 38.1 -->
  - [x] Update handleAddBot to use fillBots <!-- id: 38.2 -->
  - [x] Update button text to "Fill AI Players" <!-- id: 38.3 -->
  - [ ] Browser testing and verification <!-- id: 38.4 -->
  - [x] Fix React Hooks order error (white screen) <!-- id: 38.5 -->
  - [x] Add BIDDING phase UI controls <!-- id: 38.6 -->
- [x] Phase 39: GameBoard UI/UX Optimization <!-- id: 39 -->
  - [x] Center dipai with backdrop blur container <!-- id: 39.1 -->
  - [x] Add framer-motion animations <!-- id: 39.2 -->
  - [x] Add game control handlers (handleBid/Play/Pass/Hint) <!-- id: 39.4 -->
  - [x] Browser testing and verification <!-- id: 39.5 -->
- [x] Phase 40: GitHub Issue #19 - sync_state Missing Fields (Backend) <!-- id: 40 -->
  - [x] Update StateSerializer to add currentTurn field <!-- id: 40.1 -->
  - [x] Update StateSerializer to add phase field (derived from state) <!-- id: 40.2 -->
  - [x] Create verification script <!-- id: 40.3 -->
  - [x] Execute verification and confirm fix <!-- id: 40.4 -->
- [x] Phase 41: Fix Visual & Logic Bugs (Issues #20, Avatar, Layout) <!-- id: 41 -->
  - [x] Fix Card style (remove corner flowers) <!-- id: 41.1 -->
  - [x] Fix Avatar inconsistency (pass avatar prop) <!-- id: 41.2 -->
  - [x] Fix Missing Buttons (reactive mySeatId sync) <!-- id: 41.3 -->
