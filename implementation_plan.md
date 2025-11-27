# Fix 1: Spatial Layout - Separate Play Areas

## Goal Description
Fix the visual confusion where all played cards render at the bottom of the screen. Each player's played cards should appear near their position on the table.

## Proposed Changes

### GameTable Layout
#### [MODIFY] [src/components/GameTable.tsx](file:///Users/jiayulong/Documents/Games/doudizhu/src/components/GameTable.tsx)
- Remove central "Last Played Cards" area
- Create 4 separate play area containers:
  - **Bottom (Player 0 - User)**: `bottom-32`, centered horizontally
  - **Right (Player 1 - AI 1)**: `right-32`, centered vertically
  - **Top (Player 2 - AI 2)**: `top-32`, centered horizontally
  - **Left (Player 3 - AI 3)**: `left-32`, centered vertically
- Map `lastPlayedCards.playerId` to corresponding position
- Use smaller cards (`small` prop) for side positions to fit better
- AnimatePresence with `mode="wait"` ensures clean transitions

## Implementation Details
- Each play area checks `lastPlayedCards.playerId === players[X].id`
- Only one play area renders at a time (the current player's)
- Exit animations trigger when a new player plays
- Horizontal spacing adjusted for side positions (`-space-x-6` vs `-space-x-8`)

## Verification Plan
### Manual Verification
- **Player 0 plays**: Cards appear at bottom-center
- **AI 1 plays**: Cards appear at right-center (vertical middle)
- **AI 2 plays**: Cards appear at top-center
- **AI 3 plays**: Cards appear at left-center (vertical middle)
- **Transitions**: Old cards fade out smoothly when new player plays
