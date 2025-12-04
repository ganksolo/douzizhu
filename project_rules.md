# ... (保留你之前的代码规范等内容) ...

## 4. Definition of Done (DoD) — 通用交付协议

**Master Rule：**  
任何功能、模块或能力，只要未更新规定文档，即视为 **未完成 (Incomplete)**。  
当出现 **"DoD"**, **"Sync"**, **"完成"**, **"交付"**, **"验收"** 等指令时，必须执行完整 DoD 流程。

---

## A. 全员通用要求（Universal Requirements）

### 1. `@task.md`
- 勾选已完成任务  
- 必要时拆解新增子任务  

### 2. `@implementation_plan.md`
如行为流程、模块边界、架构设计或实现方式发生变化，必须同步更新。

### 3. `@docs/product_features.md`
若新增用户可感知的业务价值（Feature），必须以非技术语言说明该能力的行为与意义。

### 4. OpenAPI 契约同步（若启用 Swagger/OpenAPI）
- 任何 API 字段、响应结构、错误结构变更，必须同步更新 `docs/openapi.yaml`
- OpenAPI 文档与 `api_spec.md` 必须保持一致，若不一致则视为 DoD 未完成

---

## B. Backend（后端）

### 1. 更新 `@docs/api_spec.md`
任何输入、输出、契约、字段、错误格式或协议变更，都必须第一时间同步更新。

---

### 2. 产出工程事实文档（Handoff Micro-Doc）  
**文件格式： `docs/phase{number}_{module}.md`（⭐强制要求）**

所有后端功能开发任务（API / Service / DB / Logic）结束后，必须产出独立的 **Handoff Micro-Doc**  
（例如：`phase21.2_game_start.md`）。

#### 文档必须包含（工程事实 Facts）：
- 功能的结构定义（数据结构、业务实体、状态形态等）  
- 行为流程（Flow），包括前置条件 / 后置结果  
- 输入与输出契约（I/O Contract）  
- 示例（样例数据、样例负载、样例调用）  
- **可执行的验证步骤（Verification Steps）**  
  → 以抽象形式描述如何验证此功能，例如调用步骤、检查逻辑、预期行为条件等  

#### 文档目的：
- 确保功能的 **可追溯性**  
- 确保功能的 **可复现性**  
- 确保功能的 **可交接性**（独立于上下文，可用于新模型 / 新窗口 / 新 Agent）  
- 防止因上下文丢失导致工程信息中断  

#### 禁止事项：
- 不得写入任何测试结果（facts only）  
- 不得与 backend_test_plan.md 混用  

---
### 3. OpenAPI / Swagger 文档同步（若启用则为强制要求）

如果项目启用了 OpenAPI 文档（如 `docs/openapi.yaml`）并提供 swagger-ui 或 redoc：

- Backend 必须在每次 API 契约变更后同步更新：

  1. `docs/api_spec.md` —— AI 协作使用  
  2. `docs/openapi.yaml` —— Swagger / 人类调试使用  

- OpenAPI 文档必须真实反映当前接口契约，包括：
  - 请求参数结构  
  - 响应结构  
  - 错误结构  
  - 示例负载  

- 若 `api_spec.md` 与 `openapi.yaml` 不一致，视为 **DoD 未完成**。

- OpenAPI 文档可由 AI 自动生成，无需人工维护：

```
请根据 docs/api_spec.md 自动生成最新的 docs/openapi.yaml（OpenAPI 3.1）。
```

**说明：**  
API Spec 面向 AI，OpenAPI 面向人类，两者均为契约载体，必须保持一致。

---

## C. QA（测试）

### 1. 更新 `@docs/backend_test_plan.md`（长期回归测试索引）

记录以下内容：
- Test ID  
- Test Purpose  
- Coverage Scope  
- Preconditions  
- Regression Required (Y/N)  
- Latest Result（Pass / Fail）  

该文档为长期测试体系的一部分，不包含工程事实，也不负责描述具体实现细节。

---

### 2. 使用 phase 文档作为唯一测试依据（⭐关键规则）

QA 在测试某一阶段功能时，必须将：

**`docs/phase{number}_{module}.md`**

视为：

- 当前阶段唯一  
- 最终  
- 完整  
- 权威的 QA handoff 文档  

所有测试行为、验证逻辑、输入输出契约都必须以该文档为准。

QA 不得凭自身推测行为，也不得依赖代码结构进行反向推断。

（新增）当前端进入联调阶段（Frontend Integration）时，QA 必须同时参考：
  1. `docs/phase{number}_{module}.md` —— 后端工程事实  
  2. `walkthrough.md` —— 前端工程事实  
  3. `api_spec.md` / `openapi.yaml` —— 契约文档  
  
  三份文档共同构成 QA 的完整测试依据。
  
  QA 必须验证：
  - UI 行为是否符合 walkthrough.md 描述  
  - API 调用是否符合 Backend 文档  
  - 渲染字段是否与实际返回数据一致  
  - 前后端契约是否保持一致  
---

### 3. 基于 phase 文档执行通用验证流程

QA 必须验证：

- 输入处理是否正确  
- 输出是否符合 Backend 文档描述  
- 功能行为是否严格按照文档定义执行  
- 异常、边界、不完整输入是否正确处理  
- 若存在跨步骤流程，需验证流程一致性  
- 结果与工程事实描述保持一致  

---

### 4. 输出测试结果（不保存文件）

仅在当前对话中输出：
- Test Case  
- Expected vs Verified  
- Pass / Fail  
- Snapshot（如必要）  
- Issues  

禁止保存到任何文件。

---

## D. Frontend（前端）

### 1. 更新 `@walkthrough.md`

如用户交互流程、界面行为或触发事件发生变化，必须同步更新：
- 用户路径  
- 状态变化  
- 事件触发逻辑  
- 加载 / 错误处理流程  

（新增）walkthrough.md 必须体现“前端工程事实（Frontend Engineering Facts）”，包含：
- 页面结构（Page Layout）
- 用户操作路径（User Flow）
- API 调用点（何时、为何发起请求）
- UI 字段 → 数据字段的映射关系（Data Mapping）
- 状态变化逻辑（State Updates）
- 错误处理与异常分支
- 此文档在联调阶段是 **QA 的 UI 测试依据**，与 Backend phase 文档共同构成前后端统一的验收契约。
---

### 2. 更新 `@docs/api_spec.md`
如发现字段不完整、契约不一致、语义不明确，应予标注并通知 Backend。

---

### 3. 数据渲染责任

Frontend 必须确保：

- 能使用 Backend Micro-Doc 的示例数据成功渲染 UI  
- 建立 UI 字段 → 数据来源 → 语义说明 的映射规则  
- 在 walkthrough.md 中清楚描述渲染依赖，使未来 Agent 能无缝接手  

---

## E. 自动报告（Auto Reporting）

```
DoD 已执行 ✔
已同步文档：
- task.md
- implementation_plan.md
- product_features.md
- docs/phase{number}_{module}.md（Backend Micro-Doc）
QA 测试结果已在当前会话输出（未保存文件）
```

---

## F. 禁止事项（Disallowed Behaviors）

- Backend 未产出 phase 文档  
- 在 phase 文档中写入测试结果  
- Backend 与 QA 编辑同一文档  
- QA 测试结果被保存为文件  
- 忽略 API Spec / Walkthrough 导致上下文不完整  
- 未读取历史 phase 文档就进入下一阶段  
- 未执行完整 DoD 即宣布完成  

---

## G. 全局目标（Project Objectives）

该工程协议确保：

- 可复现性 (Reproducibility)  
- 可回溯性 (Traceability)  
- 可交接性 (Transferability)  
- 可测试性 (Testability)  
- 可扩展性 (Scalability)  
- 跨模型一致性 (Model-Invariance)  
- 多 Agent 协作可预测性 (Predictability)