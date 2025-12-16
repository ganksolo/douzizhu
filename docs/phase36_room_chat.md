# Phase 36: Room Chat Socket

## 概述

在 GameGateway 中实现房间内聊天消息的 Socket 处理与广播。

## 约束

- 不落库，不做消息持久化
- 仅广播到当前 roomId 内
- 不支持私聊、跨房间、图片、语音

---

## 数据流

```
Client                    GameGateway                  Room Members
  |                            |                            |
  |-- chat_send -------------->|                            |
  |   { roomId, text }         |                            |
  |                            |-- Validate roomId -------->|
  |                            |-- Validate user in room -->|
  |                            |-- Validate text length --->|
  |                            |                            |
  |                            |-- chat_message ----------->|
  |                            |   { senderId, senderName,  |
  |                            |     text, timestamp }      |
  |<---------------------------|<---------------------------|
```

---

## 实现细节

### 新增事件处理器

**文件**: `backend/src/game/gateway/game.gateway.ts`

```typescript
@SubscribeMessage('chat_send')
async handleChatSend(
    @MessageBody() data: { roomId: string; text: string },
    @ConnectedSocket() client: Socket,
)
```

### 校验逻辑

| 校验项 | 条件 | 错误响应 |
|--------|------|----------|
| roomId | 必须存在 | `chat_error: Room ID required` |
| 用户在房间 | `client.data.roomId === roomId` | `chat_error: Not in this room` |
| text 长度 | 1-200 字符 | `chat_error: Message must be 1-200 characters` |

### 广播格式

```typescript
{
  senderId: string,    // 发送者 userId
  senderName: string,  // 发送者 username
  text: string,        // 消息内容
  timestamp: number    // Unix 时间戳 (ms)
}
```

---

## WebSocket 事件

### Client → Server

| 事件 | Payload | 说明 |
|------|---------|------|
| `chat_send` | `{ roomId, text }` | 发送聊天消息 |

### Server → Client

| 事件 | Payload | 说明 |
|------|---------|------|
| `chat_message` | `{ senderId, senderName, text, timestamp }` | 广播消息 |
| `chat_error` | `{ message }` | 错误响应 |

---

## 验收标准

| 场景 | 预期结果 |
|------|----------|
| 发送 `chat_send` | 所有房间成员收到 `chat_message` |
| roomId 不存在 | 返回 `chat_error` |
| 用户不在房间 | 返回 `chat_error` |
| text 为空 | 返回 `chat_error` |
| text 超过 200 字符 | 返回 `chat_error` |
| 包含 emoji | 正常广播，不过滤 |

---

**完成时间**: 2025-12-16
