# Fix 5: Smart Hint System

## Goal
Improve the `hint` functionality to be smarter and bug-free.
1.  **Fix Bug**: Hint suggests invalid moves (e.g., 4x10 vs Rocket) because `GameTable.tsx` passes the wrong object to `getHint`.
2.  **Enhance Logic**: Hint currently always suggests the smallest single card during free play. It should prioritize more complex hands like Straights, Triples, and Pairs.

## Proposed Changes

### `src/components/GameTable.tsx`
-   **[MODIFY]** `onHintClick`: Pass `lastPlayedCards ? lastPlayedCards.type : null` to `getHint` instead of `lastPlayedCards`.

### `src/utils/ai.ts`
-   **[MODIFY]** `getHint`:
    -   Update logic to prioritize complex hands during free play (when `lastPlayedCards` is null).
    -   Order of priority: Straight > Airplane > Triple > Pair > Single.
    -   Ensure `findMoves` returns a diverse set of moves for free play.

## Verification Plan
### Automated Tests
-   None (Visual verification).

### Manual Verification
1.  **Bug Verification**:
    -   Play a game.
    -   Wait for AI to play a Bomb or Rocket.
    -   Click "Hint".
    -   Verify it does NOT suggest a smaller Bomb or invalid hand.
2.  **Smart Hint Verification**:
    -   Start a game as Landlord (free play).
    -   Click "Hint".
    -   Verify it suggests a Straight or Triple/Pair if available, rather than just the smallest 3.
