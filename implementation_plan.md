# Phase 8: Advanced Interaction & Theming

## Goal Description
Enhance user experience with drag-to-select for cards, a smart hint system to assist players, and a theme system for visual customization.

## Proposed Changes

### Interaction
#### [MODIFY] [src/components/PlayerHand.tsx](file:///Users/jiayulong/Documents/Games/doudizhu/src/components/PlayerHand.tsx)
- Implement Drag-to-Select logic:
  - Track mouse down/move/up events on the container.
  - Render a selection box visual.
  - Calculate intersection between selection box and card elements.
  - Update `isSelected` state of cards.

### Hint System
#### [MODIFY] [src/utils/ai.ts](file:///Users/jiayulong/Documents/Games/doudizhu/src/utils/ai.ts)
- Export `findMoves` (already exported).
- Create `getHint(hand, lastPlayed)`: Returns the best move (e.g., smallest valid hand).

#### [MODIFY] [src/components/GameTable.tsx](file:///Users/jiayulong/Documents/Games/doudizhu/src/components/GameTable.tsx)
- Add "Hint" button in the action bar.
- On click, call `getHint` and update player's hand selection.

### Theming
#### [NEW] [src/utils/theme.ts](file:///Users/jiayulong/Documents/Games/doudizhu/src/utils/theme.ts)
- Define theme configurations (colors, background images).
- Themes: `classic` (Green), `tech` (Blue/Dark), `wood` (Wood texture).

#### [MODIFY] [src/index.css](file:///Users/jiayulong/Documents/Games/doudizhu/src/index.css)
- Define CSS variables for theme colors (e.g., `--table-bg`, `--card-back`, `--accent-color`).

#### [MODIFY] [src/components/GameTable.tsx](file:///Users/jiayulong/Documents/Games/doudizhu/src/components/GameTable.tsx)
- Apply theme classes/styles based on selected theme.
- Add a "Settings" button to toggle themes.

## Verification Plan
### Manual Verification
- **Drag Select**: Drag mouse over cards -> Cards should be selected.
- **Hint**: Click Hint -> Valid cards should be selected.
- **Theming**: Switch themes -> Background and colors should change.
