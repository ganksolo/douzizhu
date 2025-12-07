## 6.2 Issue #18: [UX] Add AI Button Only Adds 1 Bot

**Reported**: 2025-12-07 16:58  
**Category**: UX Enhancement (Frontend + Backend)  
**Priority**: Medium  
**Status**: Open  
**GitHub**: https://github.com/ganksolo/douzizhu/issues/18

**Problem**:
Clicking "Add AI" button only adds **1 AI Bot** instead of filling all empty seats (expected: 3 bots for 4-player PVE).

**Root Cause**:
- Frontend `RoomPage.tsx` Line 142-150: `handleAddBot()` calls API **once**
- Backend `room.service.ts` Line 212-251: `addBotToRoom()` designed to add **1 bot per call**
- UX mismatch: Button implies "add AI(s)" but requires 3 clicks to fill room

**Current Behavior**:
```
User joins PVE room → (1/4)
Click "Add AI" → (2/4) ✅ 1 bot added
Click "Add AI" → (3/4) ✅ 1 bot added  
Click "Add AI" → (4/4) ✅ 1 bot added
```

**Expected Behavior**:
```
User joins PVE room → (1/4)
Click "Add AI" → (4/4) ✅ 3 bots added
```

**Proposed Solutions**:

1. **Quick Fix (Frontend Only)**:
   - Loop call `api.room.addBot()` 3 times
   - Pros: No backend change
   - Cons: Multiple network requests, race conditions

2. **Best Practice (Backend + Frontend)**:
   - New API: `POST /rooms/:id/fill-bots` with `{ count?: number }`
   - Backend atomically adds multiple bots
   - Pros: Single request, atomic operation
   - Cons: Requires backend change

3. **UX Improvement**:
   - Update button text: "🤖 Fill AI Players (3)"
   - Clearer user expectation

**Recommendation**: Implement Solution #2 (Best Practice)

**Impact**:
- Phase 28 (Seating AI) UX degraded
- Users need 3 clicks instead of 1 to start PVE game
- No functional blocker, but poor user experience

**Verification After Fix**:
1. Create PVE room (1/4)
2. Click "Add AI" button **once**
3. Expected: 3 AI bots join immediately (4/4)
4. Expected: Game auto-starts if human is ready

---

**Test Registry Updated**: 2025-12-07 17:00  
**Next Steps**: Assign to Backend Agent (Solution #2) or Frontend Agent (Solution #1)
