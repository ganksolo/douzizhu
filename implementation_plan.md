# Fix 4: UI/UX Polish - Hand Interaction & Animation

## Goal Description
Fix persistent card selection issues and improve card hover animations to prevent layout jitter and overflow.

## Issues Identified
1. **Selection State Bug**: Cards remain selected after Play, Pass, or Hint actions.
2. **Animation Jitter**: Card hover effect uses scaling which causes layout shifts and overflow.

## Proposed Changes

### Selection State Management
#### [MODIFY] [src/components/GameTable.tsx](file:///Users/jiayulong/Documents/Games/doudizhu/src/components/GameTable.tsx)
- Implement `resetHandSelection()` helper function.
- Call `resetHandSelection()` in:
  - `onPassClick`
  - `onPlayClick` (after successful play)
  - `onHintClick` (before applying hint)

### Card Animation & Layout
#### [MODIFY] [src/components/Card.tsx](file:///Users/jiayulong/Documents/Games/doudizhu/src/components/Card.tsx)
- Update `whileHover` animation:
  - Remove `scale`
  - Use `y: -15` (translateY)
- Ensure transitions are smooth (`duration-200 ease-out`).

#### [MODIFY] [src/components/PlayerHand.tsx](file:///Users/jiayulong/Documents/Games/doudizhu/src/components/PlayerHand.tsx)
- Review container styles to ensure `overflow-x: visible` but constrained width.
- Adjust card overlap logic if necessary (though CSS fix might be enough).

## Verification Plan
### Manual Verification
1. **Selection Reset**:
   - Select cards -> Click Pass -> Verify all deselected.
   - Select cards -> Click Play -> Verify remaining cards deselected.
   - Select cards -> Click Hint -> Verify only hint cards selected.
2. **Animation**:
   - Hover over cards -> Verify they move UP, not OUT.
   - Verify no horizontal scrollbar appears during hover.
   - Verify smooth transition.
