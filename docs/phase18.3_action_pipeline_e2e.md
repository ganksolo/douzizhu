# Phase 18.3: Action Pipeline Integration - QA Handoff

## Overview
This document describes the complete E2E flow for processing player actions through the Action Pipeline, including Redis persistence, distributed locking, and error handling strategies.

---

## E2E Integration Test: Complete Action Flow

### Sequence Diagram

```mermaid
sequenceDiagram
    participant Client as WebSocket Client
    participant Gateway as GameGateway
    participant Pipeline as ActionPipelineService
    participant Normalizer as InputNormalizer
    participant Redis as Redis (Lock + State)
    participant Handler as PlayActionHandler
    participant TurnMgr as TurnManager
    participant Rules as RulesService
    participant Context as GameContext

    Note over Client,Context: Player wants to play cards

    Client->>Gateway: emit('client_action', { type: 'PLAY', cards: [...] })
    activate Gateway
    Gateway->>Gateway: Extract playerId from socket.data
    Gateway->>Pipeline: execute(context, rawInput, playerId, broadcastCb)
    activate Pipeline

    Note over Pipeline: Step 1: Input Normalization
    Pipeline->>Normalizer: normalize(rawInput, playerId)
    Normalizer->>Normalizer: Validate payload structure
    Normalizer->>Normalizer: Convert card strings to Card[]
    Normalizer->>Normalizer: Enforce playerId (anti-spoofing)
    Normalizer-->>Pipeline: GameAction { type: 'PLAY', playerId, payload: Card[] }

    Note over Pipeline: Step 2: Acquire Redis Lock
    Pipeline->>Redis: SET lock:room:123 NX PX 5000
    Redis-->>Pipeline: OK (lock acquired)

    Note over Pipeline: Step 3: Snapshot State (for rollback info)
    Pipeline->>Context: JSON.stringify(roomData)

    Note over Pipeline: Step 4: Execute Handler
    Pipeline->>Handler: handle(context, action)
    activate Handler
    
    Handler->>Context: Check currentTurn == playerId?
    Context-->>Handler: ✅ Valid
    
    Handler->>Rules: validateMove(context, playerId, cards)
    activate Rules
    Rules->>Rules: Check card ownership
    Rules->>Rules: Detect pattern (PatternDetector)
    Rules->>Rules: Compare with lastMove (MoveComparator)
    Rules-->>Handler: { isValid: true }
    deactivate Rules
    
    Handler->>Context: Update lastPlayedCards
    Handler->>Context: Remove cards from player.hand
    Handler->>TurnMgr: checkGameEnd(context)
    TurnMgr-->>Handler: null (game continues)
    Handler->>TurnMgr: nextTurn(context)
    TurnMgr->>Context: Update currentTurn to next player
    deactivate Handler

    Note over Pipeline: Step 5: Atomic Write to Redis
    Pipeline->>Context: saveSnapshot()
    activate Context
    Context->>Redis: HSET room:123:state { current_state_name, room_data }
    Redis-->>Context: OK
    Context->>Redis: EXPIRE room:123:state 86400
    deactivate Context

    Note over Pipeline: Step 6: Broadcast State
    Pipeline->>Gateway: broadcastCallback()
    activate Gateway
    Gateway->>Context: Get roomData
    Gateway->>Gateway: Sanitize for each player (Fog of War)
    Gateway->>Client: emit('sync_state', sanitizedState)
    Gateway->>Client: emit('sync_state', sanitizedState)
    deactivate Gateway

    Note over Pipeline: Step 7: Release Lock
    Pipeline->>Redis: DEL lock:room:123
    Redis-->>Pipeline: OK

    Pipeline-->>Gateway: Success
    deactivate Pipeline
    Gateway->>Client: (success, no explicit ack)
    deactivate Gateway

    Note over Client: Receives updated game state
```

---

## Error Scenarios & Rollback Strategy

### Scenario 1: Handler Validation Fails (Invalid Move)

```mermaid
sequenceDiagram
    participant Pipeline as ActionPipelineService
    participant Redis as Redis
    participant Handler as PlayActionHandler
    participant Client as Client

    Note over Pipeline: Lock acquired, executing handler
    Pipeline->>Handler: handle(context, action)
    Handler->>Handler: Validate move
    Handler-->>Pipeline: ❌ throw Error('Cannot beat last move')
    
    Note over Pipeline: Error caught in try-catch
    Pipeline->>Pipeline: Log error + stack trace
    Pipeline->>Pipeline: Rollback: Skip saveSnapshot() call
    Pipeline->>Redis: DEL lock:room:123 (finally block)
    Pipeline-->>Client: throw error (caught by Gateway)
    
    Note over Client,Redis: ✅ Old state remains in Redis (automatic rollback)
    Note over Client: Client receives 'action_error' event
```

**Rollback Behavior:**
- ❌ `context.roomData` is modified in memory (corrupted)
- ✅ `saveSnapshot()` is never called → Redis keeps old valid state
- ✅ Next action will reload from Redis, discarding corrupted memory state

---

### Scenario 2: Redis Write Fails (Network/Disk Issue)

```mermaid
sequenceDiagram
    participant Pipeline as ActionPipelineService
    participant Redis as Redis
    participant Context as GameContext
    participant Client as Client

    Note over Pipeline: Handler executed successfully
    Pipeline->>Context: saveSnapshot()
    Context->>Redis: HSET room:123:state ...
    Redis-->>Context: ❌ Error: Connection timeout
    
    Context-->>Pipeline: throw Error('Failed to save snapshot')
    Pipeline->>Pipeline: Catch error, log rollback warning
    Pipeline->>Redis: DEL lock:room:123 (finally block)
    Pipeline-->>Client: throw error
    
    Note over Client,Redis: ✅ Old snapshot remains in Redis
    Note over Client: Client retries action
```

**Rollback Behavior:**
- ✅ Old state remains in Redis (write never committed)
- ✅ Client can retry the same action
- ❌ If retry succeeds, player may need to re-submit cards (client handles duplicate detection)

---

### Scenario 3: Lock Acquisition Fails (High Concurrency)

```mermaid
sequenceDiagram
    participant Client1 as Client A
    participant Client2 as Client B
    participant Pipeline as ActionPipelineService
    participant Redis as Redis

    Client1->>Pipeline: execute(action1)
    Pipeline->>Redis: SET lock:room:123 NX PX 5000
    Redis-->>Pipeline: OK (Client A gets lock)
    
    Client2->>Pipeline: execute(action2)
    Pipeline->>Redis: SET lock:room:123 NX PX 5000
    Redis-->>Pipeline: (nil) - lock exists
    Pipeline->>Pipeline: Sleep 50ms, retry 10 times
    Pipeline->>Redis: SET lock:room:123 NX PX 5000
    Redis-->>Pipeline: (nil) - still locked
    
    Note over Pipeline: After 10 retries (500ms total)
    Pipeline-->>Client2: ❌ throw Error('Failed to acquire lock')
    
    Note over Client2: Receives 'action_error', waits and retries
```

**Fallback Behavior:**
- ✅ Prevents concurrent modifications (data consistency guaranteed)
- ✅ Client receives clear error message
- ✅ Client can retry after short delay

---

## Testing Checklist

### Unit Tests
- [ ] `InputNormalizer` - Card string conversion, payload validation
- [ ] `PlayActionHandler` - Turn validation, card removal logic
- [ ] `PassActionHandler` - Free turn rejection
- [ ] `ActionPipelineService` - Lock acquisition/release, error handling

### Integration Tests
- [ ] **Test 1: Successful PLAY action**
  - Send valid PLAY action
  - Verify Redis lock acquired/released
  - Verify state updated in Redis
  - Verify broadcast triggered
  - Verify client receives `sync_state`

- [ ] **Test 2: Invalid move rejection**
  - Send PLAY with cards that don't beat last move
  - Verify handler throws error
  - Verify state NOT saved to Redis
  - Verify lock released
  - Verify client receives `action_error`

- [ ] **Test 3: Concurrent action handling**
  - Send 2 actions simultaneously from different clients
  - Verify only one acquires lock
  - Verify second action waits and retries
  - Verify both eventually succeed (if valid)

- [ ] **Test 4: Redis connection failure**
  - Simulate Redis disconnect during `saveSnapshot()`
  - Verify error is caught
  - Verify lock released
  - Verify client can retry

### E2E Test Script

```bash
cd backend
npx ts-node scripts/test-action-pipeline.ts
```

The script should:
1. Connect 2 clients to same room
2. Client A plays cards
3. Verify Client B receives update with hidden cards
4. Client B passes
5. Verify turn advances
6. Client A tries to pass on free turn → should fail
7. Verify rollback (state unchanged)

---

## Rollback Strategy Summary

| Failure Point | State in Redis | State in Memory | Client Impact | Auto-Rollback? |
|---------------|----------------|-----------------|---------------|----------------|
| Input Normalization | ✅ Unchanged | ✅ Unchanged | Receives `action_error` | ✅ Yes (nothing modified) |
| Lock Acquisition | ✅ Unchanged | ✅ Unchanged | Receives `action_error` + retry | ✅ Yes |
| Handler Validation | ✅ Unchanged | ❌ Corrupted | Receives `action_error` | ✅ Yes (not persisted) |
| Redis Write | ✅ Unchanged | ❌ Corrupted | Receives `action_error` + retry | ✅ Yes (write failed) |
| Broadcast Failure | ✅ Updated | ✅ Updated | Partial clients notified | ⚠️ Eventually consistent |

**Key Insight:**
- Redis is the **source of truth**
- If `saveSnapshot()` fails, Redis keeps old state → automatic rollback
- If handler corrupts memory but doesn't persist, next action reloads from Redis
- Distributed locks prevent concurrent corruption

---

## Performance Metrics (Expected)

| Metric | Target | Notes |
|--------|--------|-------|
| Lock acquisition time | < 5ms | Average, no contention |
| Lock retry delay | 50ms | Per retry attempt |
| Max lock holding time | < 100ms | Handler + Redis write |
| Redis write latency | < 10ms | Local Redis |
| Pipeline total latency | < 150ms | End-to-end action processing |
| Concurrency support | 100 req/s per room | With lock retries |

---

## Error Codes for Clients

| Code | HTTP Equivalent | Description | Client Should |
|------|-----------------|-------------| --------------|
| `ACTION_FAILED` | 400 | Handler validation failed | Display error message |
| `LOCK_TIMEOUT` | 503 | Failed to acquire lock | Retry after 200ms |
| `INVALID_INPUT` | 400 | Normalization failed | Fix payload format |
| `NOT_YOUR_TURN` | 403 | Turn validation failed | Wait for turn |
| `INVALID_MOVE` | 400 | Rules violation | Choose different cards |

---

## Next Steps

1. **Implement E2E Test Script**: `scripts/test-action-pipeline.ts`
2. **Performance Testing**: Use `artillery` to load test concurrent actions
3. **Monitoring**: Add metrics for lock contention, Redis latency
4. **Optimization**: Consider Redis pipelining for batch reads/writes

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-29  
**Status**: ✅ Ready for QA Testing
