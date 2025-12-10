# Phase 35: Bidding System (工程事实)

**创建日期**: 2025-12-10  
**状态**: ✅ 完成

---

## 概述

实现完整的叫分(Bidding)游戏流程，包括状态机、动作处理、AI 决策和契约更新。

---

## 代码变更

### 新建文件

| 文件 | 描述 |
|------|------|
| `backend/src/game/engine/states/bidding.state.ts` | 叫分状态机 |
| `backend/src/game/engine/action-handlers/bid-handler.ts` | BID 动作处理器 |
| `backend/src/game/engine/ai/bid-evaluator.ts` | AI 叫分决策评估器 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `game.types.ts` | 添加 BIDDING 枚举、bidHistory/highestBid/landlordSeatIndex 字段 |
| `dealing.state.ts` | 转换目标从 PlayingState 改为 BiddingState |
| `action-pipeline.service.ts` | 添加 BID 类型路由 |
| `bot.service.ts` | 添加 checkAndBid() 方法 |
| `state-serializer.service.ts` | 序列化叫分字段 |
| `game.module.ts` | 注册 BiddingState/BidActionHandler/BidEvaluator |
| `game.gateway.ts` | 传递 broadcastCallback 给 botService |

---

## 叫分流程

```
DealingState.update()
    ↓
BiddingState.enter()
    - 随机选择首叫玩家 (seatIndex 0-3)
    - 初始化 bidHistory=[], highestBid=0
    ↓
handleInput(BID)
    - 验证 bid > highestBid
    - 记录 bidHistory
    ↓
[叫分结束条件]
    - bid=3 → 立即成为地主
    - 4人都叫完 → 最高分者成为地主
    - 全部不叫 → 回到 DealingState 重新发牌
    ↓
setLandlord()
    - 将 8 张底牌加入地主手牌
    - 地主 handCount = 33
    ↓
PlayingState
```

---

## AI 叫分决策

```
评估标准:
- 炸弹: +2 分/个
- 大王: +2 分, 小王: +1 分
- 2: +0.5 分/张

阈值:
- ≥4 分: 叫 3
- ≥2 分: 叫 2
- ≥1 分: 叫 1
- <1 分: 不叫
```

---

## API 契约

### client_action BID

```json
{
  "type": "BID",
  "roomId": "uuid",
  "payload": { "bid": 3 }
}
```

### sync_state 新增字段

| 字段 | 类型 | 描述 |
|------|------|------|
| `highestBid` | number | 当前最高叫分 (0-3) |
| `landlordSeatIndex` | number \| null | 地主座位号 |
| `bidHistory` | `{seatIndex, bid}[]` | 叫分历史 |

---

## 验证结果

```
✅ npm run build - 成功编译
```
