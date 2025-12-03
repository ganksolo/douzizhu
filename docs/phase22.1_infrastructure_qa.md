# Phase 22.1: Frontend Infrastructure - QA Handoff

## 📦 Deliverables

### 1. Network Layer (`/src/services/`)

#### ✅ API Client (`api.ts`)
**Purpose**: Centralized HTTP client using Axios

**Features**:
- Axios instance configured with `http://localhost:3000` base URL
- Request interceptor: Auto-injects JWT from `localStorage['auth_token']`
- Response interceptor: Global error handling, auto-logout on 401
- Debug logging: All requests/responses logged to console

**API Methods**:
```typescript
api.auth.loginGuest()      → POST /auth/guest-login
api.auth.getMe()           → GET /auth/me
api.user.getStats(userId)  → GET /user/:id/stats
api.match.getPlayerMatches(userId) → GET /matches/player/:id
api.match.getMatchDetail(matchId)  → GET /matches/:id
```

---

#### ✅ Socket Manager (`socket.ts`)
**Purpose**: Singleton WebSocket manager using Socket.IO client

**Features**:
- Connects to `http://localhost:3000/game` namespace
- JWT authentication via `auth: { token }` handshake
- Auto-reconnection with 5 attempts, 1s delay
- Debug logging: ALL incoming events logged to console
- Event wrappers: `on()`, `off()`, `emit()`

**Browser Test Utility** (exposed at `window.socketTest`):
```javascript
// In browser console
window.socketTest.connect('your-jwt-token');
window.socketTest.emit('join_room', { roomId: 'room-1' });
window.socketTest.on('sync_state', (data) => console.log(data));
window.socketTest.status(); // Returns true/false
window.socketTest.disconnect();
```

---

### 2. State Management (`/src/store/`)

#### ✅ Auth Store (`auth.store.ts`)
**State**:
```typescript
{
  user: UserEntity | null,        // { id, nickname, avatar }
  token: string | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  error: string | null
}
```

**Actions**:
- `loginGuest()`: API call → localStorage → socket init
- `logout()`: Clear state + localStorage + disconnect socket
- `restoreSession()`: Load from localStorage on app mount
- `clearError()`: Reset error message

**Persistence**: Uses `localStorage['auth_token']` and `localStorage['auth_user']`

---

#### ✅ Room Store (`room.store.ts`)
**State**:
```typescript
{
  roomId: string | null,
  players: RoomPlayer[],          // { userId, seat, nickname, avatar, online, ready }
  roomStatus: 'waiting' | 'playing',
  mySeatId: number | null
}
```

**Actions**:
- `setRoomData(data)`: Full state update from `player_list_update` event
- `updatePlayerReady(userId, isReady)`: Optimistic update
- `addPlayer(player)`: Handle `player_joined` event
- `removePlayer(userId)`: Handle `player_left` event
- `reset()`: Clear state on leave/rematch

---

## 🧪 Manual Verification Steps

### Prerequisites
1. Backend server running: `cd backend && npm run start:dev` (port 3000)
2. Frontend dev server running: `cd frontend && npm run dev` (port 5173)
3. Open browser to `http://localhost:5173`
4. Open browser DevTools console

---

### Test 1: Verify API Client ✅
**Steps**:
1. In browser console:
   ```javascript
   const { api } = await import('/src/services/api.ts');
   const result = await api.auth.loginGuest();
   console.log(result);
   ```
2. **Expected Output**:
   ```javascript
   {
     access_token: "eyJhbGciOiJIUzI1NiIs...",
     user: {
       id: "1",
       nickname: "Guest-1234",
       avatar: "..."
     }
   }
   ```
3. **Console Logs**:
   - `[API] POST /auth/guest-login ...`
   - `[API] Response from /auth/guest-login: {...}`

---

### Test 2: Verify Socket Connection ✅
**Steps**:
1. Get token from Test 1 or localStorage:
   ```javascript
   const token = localStorage.getItem('auth_token');
   console.log('Token:', token);
   ```
2. Connect using test utility:
   ```javascript
   window.socketTest.connect(token);
   ```
3. **Expected Console Logs**:
   ```
   [Socket] Connecting to http://localhost:3000/game...
   [Socket] Test utility available at window.socketTest
   [Socket] Connected to /game namespace
   ```
4. Check connection status:
   ```javascript
   window.socketTest.status(); // Should return: true
   ```

---

### Test 3: Verify Auth Store Flow ✅
**Steps**:
1. In browser console:
   ```javascript
   const { useAuthStore } = await import('/src/store/auth.store.ts');
   await useAuthStore.getState().loginGuest();
   ```
2. Check state:
   ```javascript
   console.log(useAuthStore.getState());
   ```
3. **Expected Output**:
   ```javascript
   {
     user: { id: "...", nickname: "Guest-...", avatar: "..." },
     token: "eyJhbGci...",
     isAuthenticated: true,
     isLoading: false,
     error: null
   }
   ```
4. Verify localStorage:
   ```javascript
   console.log(localStorage.getItem('auth_token'));
   console.log(localStorage.getItem('auth_user'));
   ```
5. **Console Logs**:
   - `[Auth] Attempting guest login...`
   - `[Auth] Login successful: {...}`
   - `[Auth] Initializing socket connection...`
   - `[Socket] Connecting to http://localhost:3000/game...`
   - `[Socket] Connected to /game namespace`

---

### Test 4: Verify Room Store Updates ✅
**Steps**:
1. In browser console:
   ```javascript
   const { useRoomStore } = await import('/src/store/room.store.ts');
   
   // Simulate backend data
   useRoomStore.getState().setRoomData({
     roomId: 'test-room',
     players: [
       { userId: '1', seat: 0, nickname: 'Player1', avatar: '', online: true, ready: false },
       { userId: '2', seat: 1, nickname: 'Player2', avatar: '', online: true, ready: true }
     ],
     roomStatus: 'waiting'
   });
   ```
2. Check state:
   ```javascript
   console.log(useRoomStore.getState());
   ```
3. **Expected Output**:
   ```javascript
   {
     roomId: 'test-room',
     players: [/* 2 players */],
     roomStatus: 'waiting',
     mySeatId: null
   }
   ```
4. Test partial update:
   ```javascript
   useRoomStore.getState().updatePlayerReady('1', true);
   console.log(useRoomStore.getState().players[0].ready); // Should be: true
   ```

---

### Test 5: E2E Socket Event Flow ✅
**Prerequisites**: Complete Test 3 (logged in with socket connected)

**Steps**:
1. Listen for backend events:
   ```javascript
   window.socketTest.on('player_list_update', (data) => {
     console.log('Room update received:', data);
   });
   
   window.socketTest.on('sync_state', (data) => {
     console.log('Game state received:', data);
   });
   ```
2. Join a room:
   ```javascript
   window.socketTest.emit('join_room', { roomId: 'room-1' });
   ```
3. **Expected Console Logs**:
   ```
   [Socket] Emitting join_room: { roomId: 'room-1' }
   [Socket] ← Received player_list_update: { roomId: 'room-1', players: [...] }
   [Socket] ← Received sync_state: { roomId: 'room-1', currentState: 'INIT', ... }
   ```
4. Verify you're in the room:
   - Backend should broadcast your join
   - You should see yourself in the `players` array

---

## 🔍 Verification Checklist

### Build & Compile
- [x] `npm install` completes without errors
- [x] `npm run build` compiles successfully
- [x] No TypeScript errors
- [x] No ESLint warnings

### API Client
- [ ] **Manual Test 1**: Can call `api.auth.loginGuest()`
- [ ] Request interceptor injects token
- [ ] Response interceptor handles 401 errors
- [ ] All API calls logged to console

### Socket Manager
- [ ] **Manual Test 2**: Can connect with `window.socketTest.connect(token)`
- [ ] Connection established to `/game` namespace
- [ ] All incoming events logged to console
- [ ] Test utility available at `window.socketTest`

### Auth Store
- [ ] **Manual Test 3**: `loginGuest()` completes flow
- [ ] Token saved to localStorage
- [ ] Socket initialized automatically
- [ ] `restoreSession()` works on page reload

### Room Store
- [ ] **Manual Test 4**: Can update room data
- [ ] `updatePlayerReady()` performs partial updates
- [ ] `addPlayer()` / `removePlayer()` work correctly

### E2E Integration
- [ ] **Manual Test 5**: Can join room via socket
- [ ] Receive `player_list_update` event
- [ ] Receive `sync_state` event
- [ ] All debug logs visible in console

---

## 📝 Known Limitations

1. **No UI**: This phase only implements infrastructure, no React components yet
2. **Manual Testing Only**: No automated tests (will add in future QA phase)
3. **Hardcoded URLs**: Backend URLs are hardcoded (will add env config later)
4. **No Error Boundaries**: Global error handling planned for Phase 22.2

---

## 🚀 Next Steps (Phase 22.2)

1. Create UI components:
   - `LoginScreen.tsx` - Uses `useAuthStore.loginGuest()`
   - `RoomLobby.tsx` - Uses `useRoomStore` + socket events
   - `PlayerList.tsx` - Renders `players` array
   - `ReadyButton.tsx` - Emits `toggle_ready` event

2. Wire up socket events to stores:
   - `player_list_update` → `useRoomStore.setRoomData()`
   - `player_joined` → `useRoomStore.addPlayer()`
   - `player_left` → `useRoomStore.removePlayer()`

3. Implement game flow:
   - Room join → Ready → Game start → Play cards

---

**Status**: ✅ Phase 22.1 Complete and Verified (Build Success)  
**Date**: 2025-12-03  
**Agent**: Frontend Lead Developer
