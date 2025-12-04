# Project Rules v3 — AI-Driven Multi-Agent Engineering Protocol
斗地主 Dou Dizhu Engineering Specification  
Author: Jia Yulong  
Version: v3.0 — 2025

---

# 0. 核心理念（The Constitution）

本项目采用 **AI-Driven Multi-Agent Engineering** 模式：  
- FE Agent（前端）  
- BE Agent（后端）  
- QA Agent（测试）  
- （未来）DevOps Agent  

所有 Agent 必须严格遵守本规则，否则输出无效。

本协议目标：  
- 可复现性（Reproducibility）  
- 可回溯性（Traceability）  
- 可交接性（Transferability）  
- 可测试性（Testability）  
- 跨模型一致性（Model-Invariance）  
- 多 Agent 协作可预测性（Predictability）

---

# 1. 文档体系（Documentation System）

项目所有核心真相（Facts）必须写入以下文档：

- `task.md`
- `implementation_plan.md`
- `walkthrough.md`
- `docs/api_spec.md`
- `docs/ws_events.md`
- `docs/phase{number}_{module}.md`
- `docs/backend_test_plan.md`
- `docs/product_features.md`
- （若启用）`docs/openapi.yaml`

**未写入即视为不存在。**

---

# 2. 全局同步协议（Sync Protocol）

当我说出以下任意指令时：  
- “DoD”  
- “Sync”  
- “完成”  
- “交付”  

FE / BE / QA 必须立即执行完整 DoD（Definition of Done）流程（见第 4 章）。

---

# 3. 多 Agent 角色边界（Role Boundaries）

## FE Agent
负责：
- UI / 状态管理 / 用户交互  
- 前端联调  
- 渲染 SyncState  
- 更新 walkthrough.md、api_spec.md、ws_events.md

**不得修复后端逻辑，不得修改 phase 文档。**

---

## BE Agent
负责：
- API / 状态机 / DB / Redis  
- ws events  
- 行为逻辑  
- 更新 phase 文档 + api_spec + openapi.yaml

**Contract_bug 的第一责任人。**  
**不得修改 walkthrough.md（这是 FE 的职责）。**

---

## QA Agent
负责：
- 独立验证  
- Bug 分类  
- 创建 GitHub Issue  
- Regression 回归  
- 更新 backend_test_plan.md

**不得修改代码，不得修复 Bug。**

---

# 4. Definition of Done（DoD）

无论 FE / BE / QA，DoD 必须包含：

- 更新 `task.md`
- 更新 `implementation_plan.md`（如架构/行为变化）
- 更新 `product_features.md`（如影响用户价值）
- 若 API 变动：
  - 更新 `docs/api_spec.md`
  - 更新 `docs/openapi.yaml`
- 若为后端模块开发：
  - 必须新增 `docs/phase{number}_{module}.md`
- 若为前端联调：
  - 更新 `walkthrough.md`
  - 更新 `docs/ws_events.md`

未执行 DoD = 功能未完成。

---

# 5. Bug Routing System（缺陷分类与分发系统）⭐

## 5.1 缺陷分类（QA 专用）

QA Agent 必须把每个问题归类为 4 类之一：

| 类别 | 描述 |
|------|------|
| **FE_bug** | UI、渲染、交互、前端 API 调用 |
| **BE_bug** | API 逻辑、状态机、数据库、Redis、ws event |
| **DevOps_bug** | Docker、服务启动、端口、env、部署脚本 |
| **Contract_bug** | 前后端字段/结构/协议不一致 |

**QA 不得修复 Bug。**

---

## 5.2 Issue 创建（必经流程）

QA 必须通过 MCP GitHub 创建 Issue，包含：

- 标题  
- 描述（问题背景）  
- 复现步骤  
- 预期行为  
- 实际行为  
- Bug 类型 label  
- 指派（Assignee）  
- 可选附件（截图、日志等）

---

## 5.3 Issue 自动认领（FE / BE / DevOps）

### FE Agent  
自动领取：`FE_bug`、状态=Open

### BE Agent  
自动领取：`BE_bug`、`Contract_bug`（主责）

### DevOps Agent  
自动领取：`DevOps_bug`

---

## 5.4 Contract_bug 特殊规则（非常关键）

```
Contract_bug 必须由 BE Agent 先修复，
FE Agent 后同步前端数据结构。
```

流程：

1. QA 标记 Contract_bug → assign 给 BE  
2. BE：
   - 修复 API 字段  
   - 更新 api_spec  
   - 更新 phase 文档  
   - 标记 Issue = Ready for FE Sync  
3. FE：  
   - 同步 UI 与前端数据模型  
   - 更新 walkthrough.md / ws_events.md  
   - 标记 Issue = Ready for QA  
4. QA Regression，标记为 Verified

---

## 5.5 Bug Issue 模板（示例，仅教学用途，不得视为真实问题）

> ⚠ **下方内容全部为示例，不属于本项目真实问题。**  
> QA 创建真实 Issue 时必须替换掉所有示例内容。

```
目标仓库：ganksolo/douzizhu  
Bug 类别（归属）：FE_bug | BE_bug | DevOps_bug | Contract_bug  
指派：FE Agent / BE Agent / DevOps Agent  

---

# 🐞 Bug 标题
[示例] 首页轮播图在移动端无法滑动

# 📌 描述
（示例）移动端 Safari 中滑动事件无效。

# 🔬 复现步骤
1. 打开……
2. 滑动……
3. 出现……

# 🎯 预期行为
（示例）应该可以滑动……

# 🧨 实际行为
（示例）无法滑动……

# 🏷 Labels
FE_bug

# 📎 额外信息（可选）
设备、系统、截图、日志
```

---

# 6. Frontend Rules（前端规则）

- 必须维护 walkthrough.md  
- 必须维护 ws_events.md  
- 必须渲染 SyncState  
- Contract_bug = 等待 BE 修复 → 前端同步 → Ready for QA

---

# 7. Backend Rules（后端规则）

- 必须维护 phase 文档（工程事实）  
- 必须维护 api_spec & openapi  
- Contract_bug = BE 主责（先修复，再通知 FE）

---

# 8. QA Rules（测试规则）

- 不得修改代码  
- 不得修复 Bug  
- 只负责验证、分类、记录  
- 必须创建 Issue  
- 必须执行 Regression  
- 更新 backend_test_plan.md

---

# 9. 禁止事项（Disallowed Behaviors）

- Backend 未写 phase 文档  
- QA 写入代码或修复问题  
- FE 修改后端工程事实  
- 前后端契约不一致  
- 未执行 DoD 就标记完成  
- 未通过 QA Regression 就提交到下一阶段

---

# 10. 工程目标（Project Objectives）

让本项目成为：

- 可由不同 Agent 无缝接手  
- 可在不同模型间无损迁移  
- 可从任意 Phase 恢复上下文  
- 可自动化联调  
- 可自动化测试  
- 可自动化修复  
- 具备真正 AI-Driven 工程体系的项目

