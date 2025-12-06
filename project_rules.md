# Project Constitution — L0 Global Rules (v7)
Repository: https://github.com/ganksolo/douzizhu.git
Version: v7 — Merged (Context-Rich & AI-Optimized)

# 1. Core Purpose & Triggers (核心宗旨与触发器)

本文件是全项目最高优先级规则（L0），定义了 **FE/BE/QA Agent** 的协作宪法。
所有 Agent 必须严格遵守，**未写入本文档的事实视为不存在**。

## 1.1 Action Triggers (全局指令)
当用户输入以下任意指令时，Agent 必须立即执行完整 **DoD (Definition of Done)** 流程：
- **"DoD"**
- **"Sync"**
- **"完成"** / **"交付"**

# 2. File Autonomy Model (文件自治域模型)

为了防止上下文冲突，项目划分为严格的自治域。Agent 只能修改自己领域内的文件。

| Domain (自治域) | 核心职责 | ✅ Write Access (允许写入/修改) | ❌ Read-Only (严禁修改) |
| :--- | :--- | :--- | :--- |
| **FE Domain** | UI, 交互, 状态渲染 | **`src/frontend/**/*`** (代码)<br>`docs/frontend_walkthrough.md`<br>`docs/ws_events.md` | `src/backend/*`<br>`docs/phase*.md`<br>`docs/api_spec.md` |
| **BE Domain** | API, 逻辑, 数据存储 | **`src/backend/**/*`** (代码)<br>`docs/phase*.md` (工程事实)<br>`docs/api_spec.md`<br>`docs/openapi.yaml` | `src/frontend/*`<br>`docs/frontend_walkthrough.md`<br>`docs/backend_test_registry.md` |
| **QA Domain** | 验证, Bug 路由 | **`test/**/*`** (测试代码)<br>`docs/backend_test_registry.md`<br>`task.md` (Issue 管理) | **`src/**/*` (严禁改产品代码)**<br>严禁直接修复 Bug |
| **Shared Domain**| 协作与规划 | `task.md`<br>`implementation_plan.md`<br>`docs/product_features.md` | `project_rules.md` (宪法) |

# 3. Execution SOP (写入前必须执行)

在修改任何 **Shared Domain** 或 **Critical Docs (如 api_spec)** 前，必须执行 SOP：

1.  **Plan**: 列出将要修改的文件路径列表。
2.  **Reason**: 解释修改原因。
3.  **Action**: 说明是 Append (追加)、Replace (替换) 还是 Rewrite (重写)。
4.  **Confirm**: **必须等待用户确认“执行”后**，方可写入。

# 4. Bug Routing System (缺陷分类与分发) [来自 V3]

QA Agent 必须将问题归类为以下 4 类，并指派给对应 Agent：

| Bug 类别 | 描述 | 责任方 (Assignee) |
| :--- | :--- | :--- |
| **FE_bug** | UI 渲染、交互逻辑、前端状态错误 | **FE Agent** |
| **BE_bug** | API 逻辑、数据库、Redis、纯后端 Crash | **BE Agent** |
| **DevOps_bug** | Docker 启动、环境配置、端口冲突 | **DevOps Agent** |
| **Contract_bug** | **前后端字段/结构/协议不一致** | **BE Agent (主责)** |

# 5. Workflow: Contract_bug Resolution (核心流程)

**规则：Contract_bug 必须由 BE 先修，FE 后同步。**

1.  **QA**: 标记 Issue 为 `Contract_bug` -> Assign to **BE**.
2.  **BE**:
    * 修复后端代码 & API。
    * 更新 `api_spec.md` 和 `phase` 文档。
    * 标记 Issue: **"Ready for FE Sync"**.
3.  **FE**:
    * 根据新 Spec 同步前端数据模型/UI。
    * 更新 `frontend_walkthrough.md`。
    * 标记 Issue: **"Ready for QA"**.
4.  **QA**: 执行回归测试 -> 标记 **Verified/Closed**.

# 6. Definition of Done (DoD)

任何任务（Feature 或 Bug Fix）交付前，必须检查以下清单。未完成即视为无效交付。

### 6.1 文档更新 (Document Updates)
- [ ] **Task**: 更新 `task.md` 状态。
- [ ] **Architecture**: 若架构变动，更新 `implementation_plan.md`。
- [ ] **Product**: 若功能变动，更新 `docs/product_features.md`。
- [ ] **BE Facts**: (后端任务) 必须更新 `docs/phase*.md` 和 `api_spec.md`。
- [ ] **FE Facts**: (前端任务) 必须更新 `docs/frontend_walkthrough.md` 和 `ws_events.md`。

### 6.2 质量检查 (Quality Check)
- [ ] **Tests**: QA 已更新 `backend_test_registry.md`。
- [ ] **Dependency**: 确认没有破坏上游文档依赖。
- [ ] **Autonomy**: 确认没有越权修改其他 Domain 的文件。

# 7. Global Constraints (绝对禁令)

1.  **严禁跨域写入**：FE 不得改后端代码，QA 不得改产品代码。
2.  **严禁幻觉修复**：QA 只能报 Bug，不能直接在测试报告里写“修复代码”。
3.  **严禁无文档交付**：代码变了，文档没变 = **拒绝接收**。
4.  **宪法不可变**：严禁 AI 修改 `project_rules.md`。

# END