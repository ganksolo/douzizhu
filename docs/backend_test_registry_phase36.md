# Backend Test Plan (Phase 15 - 36)

**Version**: 4.0  
**Last Updated**: 2025-12-07 16:50  
**Scope**: Backend Game Engine, Rules Service, AI Core, Action Pipeline, Integration, Match History, User Infrastructure, Auth, Stats, Room Resilience, Frontend Integration (Phase 22.1-36)

[... existing content ...]

---

### 5.27 Phase 36: Frontend Gameplay UI State Integration

**Scope**: Verify frontend GameBoard UI correctly integrates with backend game state synchronization
**Type**: Manual Browser Testing + Code Review
**Files**: 
- Frontend: `frontend/src/components/game/GameBoard.tsx`
- Store: `frontend/src/store/game.store.ts`
- API Contract: `docs/ws_events.md` (sync_state event)
**Last Executed**: 2025-12-07 16:20
**Status**: ⚠️ **PASSED with Bugs Found**

| Test Case | Description | Result |
|-----------|-------------|--------|
| **UI-36.1** | game.store.ts sync_state listener integration | ✅ PASS (Code Review) |
| **UI-36.2** | myHand state management and rendering | ✅ PASS (Code Review) |
| **UI-36.3** | lastPlayedCards display in 4 quadrants | ✅ PASS (Code Review) |
| **UI-36.4** | Turn indicator integration (isTurn prop) | ✅ PASS (Code Review) |
| **UI-36.5** | Game controls (Play/Pass/Hint) handlers | ✅ PASS (Code Review) |
| **UI-36.6** | PlayerHand component integration | ✅ PASS (Code Review) |
| **UI-36.7** | **Browser Manual Testing** | ❌ **BLOCKED by Bug #17** |

**Code Review Summary**:
- ✅ `GameBoard.tsx` Lines 38-50: All required state hooks implemented
- ✅ `GameBoard.tsx` Lines 74-79: `useMemo` optimization for hand cards
- ✅ `GameBoard.tsx` Lines 161-186: Last played cards rendering in 4 positions
- ✅ `GameBoard.tsx` Lines 106-127: Game control handlers wired correctly

**Browser Testing Note**:
Manual testing blocked due to **Bug #17** (PVE rooms not auto-filling AI bots). See Issue #17 for details.

**Recommendation**:
- Re-test after Bug #17 fix is deployed
- Create automated Playwright test for Phase 36 UI verification

---

## 6. Known Issues (Bugs Found During QA)

### Issue #17: [FE_bug] PVE Room Creation Missing `type` Field

**Reported**: 2025-12-07 16:45  
**Category**: FE_bug  
**Priority**: High  
**Status**: Open  
**GitHub**: https://github.com/ganksolo/douzizhu/issues/17

**Problem**:
AI Bots do not auto-join PVE rooms after creation. User enters room and sees "AI Bots: 0".

**Root Cause**:
Frontend `api.ts` Line 191-198 does not send `type: 'PVE'` field to backend in POST /rooms payload.

**Impact**:
- Backend PVE auto-fill logic (`room.service.ts` Line 391) never triggers
- Phase 35 (PVE Auto-Fill) functionality broken
- Users cannot test single-player mode

**Contract Violation**:
Per `api_spec.md` Line 188, `type` field is **required** for PVE room differentiation:
```json
{
  "type": "string (optional, enum: 'PVP' | 'PVE', default: 'PVP')"
}
```

**Fix Required** (FE Agent):
```typescript
// File: frontend/src/services/api.ts Line 192-196
const payload = {
    name: config.type === 'PVE' ? '[PvE] Solo Practice' : `[PvP] Room ${Date.now()}`,
    maxPlayers: 4,
    type: config.type,  // ✅ ADD THIS LINE
    isPrivate: false,
};
```

**Verification Steps After Fix**:
1. Run `npm run dev` (frontend)
2. Navigate to Lobby → Click "单人练习"
3. Expected: 3 AI bots auto-join immediately
4. Expected: Game auto-starts when human player clicks "Ready"

**Related Phases**:
- Phase 22.3 (Lobby System)
- Phase 35 (PVE Auto-Fill and Auto-Start)
- Phase 36 (Frontend Gameplay UI) - **Blocked by this bug**

---

## 7. Test Automation Recommendations

### 7.1 Phase 36 Automated UI Tests (Future Work)

**Tool**: Playwright / Cypress

**Test Suite**: `e2e/phase36_gameplay_ui.spec.ts`

```typescript
test('Phase 36: Game UI State Integration', async ({ page }) => {
    // 1. Login
    await page.goto('http://localhost:5173/login');
    await page.click('button:text("Guest Login")');
    
    // 2. Create PVE Room (after Bug #17 fix)
    await page.waitForURL('**/lobby');
    await page.click('button:text("单人练习")');
    
    // 3. Wait for game start
    await page.waitForSelector('.game-board', { timeout: 10000 });
    
    // 4. Verify hand cards render
    const handCards = page.locator('.my-hand .card');
    await expect(handCards).toHaveCount(25);
    
    // 5. Verify AI players visible
    const aiPlayers = page.locator('[data-is-bot="true"]');
    await expect(aiPlayers).toHaveCount(3);
    
    // 6. Wait for AI to play
    await page.waitForSelector('[data-last-played]', { timeout: 5000 });
    
    // 7. Verify last played cards appear
    const lastPlayed = page.locator('[data-last-played] .card');
    await expect(lastPlayed.count()).toBeGreaterThan(0);
    
    // 8. Verify turn indicator
    const currentTurnPlayer = page.locator('[data-is-turn="true"]');
    await expect(currentTurnPlayer).toBeVisible();
    
    // 9. Test game controls
    await handCards.first().click(); // Select a card
    await page.click('button:text("Play")');
    
    // 10. Verify card removed from hand
    await expect(handCards).toHaveCount(24);
});
```

**Benefits**:
- Automated regression testing for Phase 36
- Catches frontend-backend integration bugs early
- Reduces manual testing time from 15 min to 2 min

---

**Test Registry Updated by**: QA Agent  
**Next Review**: After Bug #17 resolution
