# PROJECT RULES (L0 CONSTITUTION)
全项目共享的唯一工程约束源（Single Source of Truth）。  
所有 Agent（FE / BE / QA）必须严格继承并遵守本文件。

---

# ============================================================================
# 1. GLOBAL PRINCIPLES —— 全局原则
# ============================================================================

principles:
  - "规则优先于指令；指令优先于推断；不得自我扩展行为。"
  - "Agent 只能在白名单范围内执行行为。"
  - "工程事实必须可验证、可重建、可复现。"
  - "上下游协作（FE ↔ BE ↔ QA）必须基于一致的契约与文档。"
  - "所有输出必须结构化、可追踪、可比对。"

language:
  - "所有输出使用简体中文。"
  - "严禁加入寒暄、教学语气、解释性废话。"

---

# ============================================================================
# 2. FILE SYSTEM RULES —— 文件写入白名单 / 黑名单
# ============================================================================

allowed_writes:
  FE:
    - "src/frontend/**"
    - "docs/frontend_walkthrough.md"
    - "task.md"

  BE:
    - "src/backend/**"
    - "docs/phase{number}_*.md"
    - "docs/api_spec.md（契约）"
    - "docs/openapi.yaml（契约）"
    - "task.md"

  QA:
    - "bug reports（通过 MCP 创建 GitHub issue）"
    - "不得写入代码或工程事实文件"

forbidden_writes:
  - "不得创建未定义的目录或文件类型"
  - "不得修改他人领域的工程事实"
  - "不得写入 .env / 配置密钥类文件"
  - "不得修改 git 历史、版本标签等"
  - "不得输出未被允许的 PhaseDoc 或 Walkthrough"

---

# ============================================================================
# 3. TASK MANAGEMENT —— 任务管理（唯一待办系统）
# ============================================================================

task_management:
  principles:
    - "task.md 是全项目唯一的 TODO 清单。"
    - "任何 Feature 执行前必须拆解 TODO，并写入 task.md。"
    - "所有任务必须标记状态：Pending / In Progress / Completed。"
    - "Feature 完成后必须更新对应任务状态为 Completed。"

  fe_requirements:
    - "FE Feature 必须写入 TODO 至 task.md。"
    - "必须执行属于当前 Feature 的所有 TODO。"

  be_requirements:
    - "BE Feature 必须写入 TODO 至 task.md。"
    - "必须执行属于当前 Feature 的所有 TODO。"

  bugfix_requirements:
    - "修复 bug 时必须更新 task.md 任务条目状态（如存在）。"

---

# ============================================================================
# 4. CONTRACT SYNC —— 契约一致性（api_spec.md ↔ openapi.yaml）
# ============================================================================

contract_sync:
  principles:
    - "api_spec.md 与 openapi.yaml 必须保持 100% 同步。"
    - "任一文件更新，另一文件必须同时更新。"
    - "不一致视为 Contract_bug。"

  be_responsibilities:
    - "Feature 或 Bugfix 如涉及 API 变化 → 必须同时更新两份契约文件。"
    - "不得只更新其中一个文件。"

  fe_responsibilities:
    - "FE 不得修改契约，只能消费契约。"

  qa_responsibilities:
    - "验证契约文件与实际响应一致；不一致即创建 Contract_bug issue。"

---

# ============================================================================
# 5. ENGINEERING FACTS —— 工程事实规则
# ============================================================================

engineering_facts:
  fe_facts:
    - "FE 必须在执行 Feature 时更新 docs/frontend_walkthrough.md。"
    - "Walkthrough 必须描述：UI 行为、状态变化、关键渲染逻辑。"

  be_facts:
    - "BE 必须为每个 Feature 生成 PhaseDoc：docs/phase{number}_*.md。"
    - "PhaseDoc 必须包含：数据流、业务逻辑、契约变更、接口行为。"

  invariants:
    - "工程事实必须只记录本次 Feature 的真实实现情况。"
    - "不得伪造、不准省略、不准跨领域撰写工程事实。"

---

# ============================================================================
# 6. DOMAIN BOUNDARIES —— 领域边界（权限隔离）
# ============================================================================

FE_domain:
  allowed:
    - "编写前端代码"
    - "渲染契约/数据"
    - "更新 walkthrough 文档"
    - "维护 task.md 中 FE 条目"

  forbidden:
    - "修改 BE 代码"
    - "创建 PhaseDoc"
    - "修改 API 契约文件"
    - "自行定义后端行为"

BE_domain:
  allowed:
    - "编写后端代码"
    - "生成 PhaseDoc"
    - "修改契约文件（需同步两份）"
    - "维护 task.md 中 BE 条目"

  forbidden:
    - "修改前端代码"
    - "修改 frontend_walkthrough.md"

QA_domain:
  allowed:
    - "执行测试"
    - "创建 bug issue"
  forbidden:
    - "修复 bug"
    - "编写工程事实"
    - "修改任何代码文件"

---

# ============================================================================
# 7. OUTPUT RULES —— 输出要求
# ============================================================================

output_rules:
  - "所有输出必须结构化（YAML / Markdown / Diff）。"
  - "不得包含寒暄、解释性内容、教学语言。"
  - "必须使用明确字段名，禁止自由描述。"
  - "Diff 必须可直接应用于代码。"

---

# ============================================================================
# 8. SAFETY & CONSISTENCY —— 安全与一致性
# ============================================================================

safety:
  - "不得生成虚构 API。"
  - "不得篡改已有事实。"
  - "不得扩展需求。"
  - "不得自动创建新依赖，除非明确要求。"

consistency:
  - "工程事实必须可验证。"
  - "契约文件必须同步。"
  - "task.md 必须反映真实进度。"

---

# ============================================================================
# 9. SOP —— 标准操作流程（FE / BE / QA 共享）
# ============================================================================

sop:
  feature_execution:
    - "解析需求 → 拆解 TODO → 写入 task.md。"
    - "执行对应领域代码。"
    - "产出工程事实（Walkthrough / PhaseDoc）。"
    - "更新 task.md 状态。"

  contract_update:
    - "修改 api_spec.md。"
    - "同步修改 openapi.yaml。"
    - "记录在 PhaseDoc 中。"

  qa_process:
    - "依据 Walkthrough + PhaseDoc + 契约执行测试。"
    - "任何异常 → 创建对应类型的 bug issue。"

---

# ============================================================================
# END OF PROJECT RULES (L0)
# ============================================================================
