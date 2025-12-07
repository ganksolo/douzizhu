# Phase 32: Backend Game Loop Verification & Contract Fixes

## 1. Contract Standardization (`client_action` Funnel)
We have transitioned from discrete socket events (`play_cards`, `pass`) to a unified `client_action` funnel to simplify the frontend-backend interface and enable better middleware processing (validation, logging, replay).

**New Event Structure:**
```json
{
  "type": "client_action",
  "payload": {
    "roomId": "uuid",
    "type": "PLAY | PASS",
    "payload": [Card Objects] | null
  }
}
```

## 2. Hardened Validation
Implemented strict runtime validation in `InputNormalizer` and `PlayActionHandler`:
*   **Payload Type**: Ensures `PLAY` payload is an array of Cards (or strings converted to Cards). Limit 20 cards.
*   **Ownership**: `PlayActionHandler` explicitly verifies that the player *holds* the cards they are trying to play in their hand.
*   **Rank/Suit Integrity**: Validates card format.

## 3. Verification Results
Executed `scripts/verify_game_loop.ts`:
*   **Flow**: Register -> Create Room -> Join -> Add Bots -> Start -> Play/Pass.
*   **Outcome**: Success.
    *   User successfully identified turn.
    *   User successfully emitted `PLAY` action.
    *   Server processed action without error.

**Log Snippet:**
```
3. Connecting Socket...
   Socket connected: ...
   Joined room.
4. Adding 3 Bots...
   Bots added.
5. Toggling Ready...
   ✅ Game Started!
7. Waiting for my turn...
   [Sync] Phase: PlayingState, Turn: 116 (Me: 116)
   👉 IT IS MY TURN!
   Leading with ♠8...
   ✅ Action emitted.
```

## 4. Next Steps
*   **Frontend (Phase 31)**: Update `socket.ts` to use `client_action` and test UI buttons.
*   **QA**: Regression test full game flow with 4 players (1 human + 3 bots).
