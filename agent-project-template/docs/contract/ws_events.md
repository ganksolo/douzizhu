# WebSocket Events Specification

## 概述
定义前后端实时通信的 WebSocket 事件。

**Namespace**: `/game`  
**Protocol**: Socket.IO  
**Authentication**: JWT token via `auth: { token }` handshake

---

## Client → Server Events

### 1. `join_room`
**Purpose**: 加入房间

**Payload**:
```typescript
{
  roomId: string
}
```

---

### 2. `leave_room`
**Purpose**: 离开房间

**Payload**:
```typescript
{
  roomId: string
}
```

---

## Server → Client Events

### 1. `sync_state`
**Purpose**: 同步游戏状态

**Payload**:
```typescript
{
  phase: 'INIT' | 'PLAYING' | 'GAME_END',
  // ... 根据项目需求定义
}
```

---

### 2. `player_list_update`
**Purpose**: 玩家列表更新

**Payload**:
```typescript
{
  roomId: string,
  players: Player[]
}
```

---

## 事件流示例

### 加入房间
```
[Client] emit('join_room', { roomId: 'room-1' })
[Server] → on('player_list_update', { players: [...] })
[Server] → on('sync_state', { ... })
```

---

**Last Updated**: YYYY-MM-DD
