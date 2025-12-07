# Implementation Plan - Phase 31: Game Loop UI Implementation

## Goal Description
Implement the interactive Game Board for the "Playing" state. This involves creating a dedicated `GameControls` component for user actions (Play, Pass, Hint), refactoring `GameBoard.tsx` to use it, and enhancing visual feedback with turn indicators.
We identified that `GameBoard.tsx` is the active component used by `GamePage.tsx`, so we will focus our efforts there and ignore the legacy `GameTable.tsx`.

## User Review Required
> [!NOTE]
> `GameTable.tsx` in `src/components/` appears to be legacy code. We are proceeding with `src/components/game/GameBoard.tsx` as the source of truth.

## Proposed Changes

### Frontend Components

#### [NEW] [GameControls.tsx](file:///Users/jiayulong/Documents/Games/doudizhu/frontend/src/components/game/GameControls.tsx)
- Create a new component to house the action buttons: "Play", "Pass", "Hint".
- Props:
  - `onPlay`: () => void
  - `onPass`: () => void
  - `onHint`: () => void
  - `selectedCount`: number (to disable Play if 0)
  - `isTurn`: boolean
  - `canPass`: boolean (true if not leading the trick)

#### [MODIFY] [GameBoard.tsx](file:///Users/jiayulong/Documents/Games/doudizhu/frontend/src/components/game/GameBoard.tsx)
- Remove embedded button logic.
- Import and use `GameControls`.
- Add visual countdown timer mockup (e.g., 30s) near the active player's avatar.
- Ensure `PlayerHand` selection state is correctly managed and passed to `GameControls`.

#### [MODIFY] [PlayerAvatar.tsx](file:///Users/jiayulong/Documents/Games/doudizhu/frontend/src/components/game/PlayerAvatar.tsx)
- Enhance `isTurn` visual (glow effect, timer ring if possible).

## Verification Plan

### Automated Verification
- Use `window.socketTest` to inject `PLAYING` state with `currentTurn` set to the user (seat 0).
- Verify `GameControls` appear.
- Verify "Play" button is disabled initially (0 cards selected).
- Select cards -> Verify "Play" enables.

### Manual Verification
- **Test 1**: Game enters "Playing" state -> User sees their hand.
- **Test 2**: Select cards -> Click Play -> Console logs action emission (mocked or real).
- **Test 3**: Opponent plays (simulated via socketTest) -> Table area updates.

# [Phase 32: Backend Game Loop Verification & Contract Fixes]

## Goal Description
Verify and harden the Backend's ability to handle the Game Loop (Play/Pass), ensuring the API Contract matches the implementation (Event Funnel vs Discrete Events) and that input validation is robust.

## User Review Required
> [!IMPORTANT]
> **Contract Change**: We are standardizing Client -> Server game actions to use a single `client_action` event with a `type` payload (e.g., `{ type: 'PLAY', payload: ... }`), rather than discrete events like `play_cards`. The `api_spec.md` will be updated to reflect this reality.

## Proposed Changes

### Documentation
#### [MODIFY] [api_spec.md](file:///Users/jiayulong/Documents/Games/doudizhu/docs/api_spec.md)
- Update "Events (Client -> Server)" section to replace discrete action events with the `client_action` funnel pattern.
- detailed payload schemas for `PLAY` and `PASS`.

### Backend Logic
#### [MODIFY] [play-handler.ts](file:///Users/jiayulong/Documents/Games/doudizhu/backend/src/game/engine/action-handlers/play-handler.ts)
- Add runtime validation for `payload`. Ensure it is a valid array of Card objects or strings before processing.
- Throw descriptive errors for invalid payloads.

#### [MODIFY] [input-normalizer.ts](file:///Users/jiayulong/Documents/Games/doudizhu/backend/src/game/engine/action-pipeline/input-normalizer.ts)
- Enhance normalization to ensure consistent `PLAY` payload structure (e.g. converting `{ cards: [...] }` to `[...]` if valid, or rejecting).

### Verification Support
#### [NEW] [verify_game_loop.ts](file:///Users/jiayulong/Documents/Games/doudizhu/backend/scripts/verify_game_loop.ts)
- A standalone script to simulate:
    1.  User Login & Room Join.
    2.  Game Start.
    3.  `client_action` emission (Play/Pass) via Socket.
    4.  Verification of `sync_state` updates (Hand count reduction, Last Played update).
    5.  Error handling (Invalid move).

## Verification Plan

### Automated Verification
- Run `npx ts-node scripts/verify_game_loop.ts` and confirm all steps pass (Connect -> Start -> Play -> Verify).

