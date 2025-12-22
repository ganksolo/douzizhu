# PROJECT RULES (L0 CONSTITUTION)
# 全项目共享的唯一工程约束源（Single Source of Truth）
# 所有 Agent（PM / FE / BE / QA）必须严格继承并遵守本文件

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
  PM:
    - "docs/specs/SPEC-*.md"
    - "docs/contract/**"
    - "task.md"

  FE:
    - "frontend/**"
    - "docs/changelog/FE-*.md"
    - "task.md"

  BE:
    - "backend/**"
    - "docs/changelog/BE-*.md"
    - "docs/contract/**"
    - "task.md"

  QA:
    - "docs/test_registry.md"
    - "task.md (仅更新状态)"

forbidden_writes:
  - "不得创建未定义的目录或文件类型"
  - "不得修改他人领域的工程事实"
  - "不得写入 .env / 配置密钥类文件"
  - "不得修改 git 历史、版本标签等"
  - "project_rules.md 禁止任何 Agent 修改"

---

# ============================================================================
# 3. TASK MANAGEMENT —— 任务管理（唯一待办系统）
# ============================================================================

task_management:
  principles:
    - "task.md 是全项目唯一的 TODO 清单。"
    - "任何 Feature 执行前必须拆解 TODO，并写入 task.md。"
    - "所有任务必须标记状态：[ ] Pending / [/] In Progress / [x] Completed。"
    - "Feature 完成后必须更新对应任务状态为 Completed。"

---

# ============================================================================
# 4. DOCUMENTATION RULES —— 统一文档规则（改进版）
# ============================================================================

documentation:
  specs:
    format: "docs/specs/SPEC-{序号}_{功能名称}.md"
    creator: "PM Agent"
    required_when: "FE-BE 联动功能"
    required_sections:
      - "需求来源"
      - "接口定义（REST API / WebSocket）"
      - "FE 任务列表"
      - "BE 任务列表"
      - "验证标准"
      - "执行顺序"

  changelog:
    format: "docs/changelog/{FE|BE}-{YYYYMMDD-HHMMSS}_{模块名}.md"
    naming_example: "FE-20241222-171000_room_chat.md"
    naming_rule: "使用时间戳避免多人协作时的编号冲突"
    required_sections:
      - "元信息（日期、关联任务）"
      - "变更概述"
      - "受影响文件"
      - "契约变更（如有）"
      - "验证结果"

  contract:
    ssot: "docs/contract/openapi.yaml"
    auto_generated: "docs/contract/api_spec.md"
    ws_events: "docs/contract/ws_events.md"
    rule: "openapi.yaml 更新后，运行 gen-spec 自动生成 api_spec.md"

  roadmap:
    file: "docs/roadmap.md"
    maintainer: "任何 Agent 可更新 Milestone 状态"

---

# ============================================================================
# 5. DOMAIN BOUNDARIES —— 领域边界（权限隔离）
# ============================================================================

PM_domain:
  allowed:
    - "分析需求，判断是否需要 Spec"
    - "生成 Spec 文档"
    - "更新契约文件（openapi.yaml, ws_events.md）"
    - "分配任务给 FE/BE Agent"
    - "维护 task.md"
  forbidden:
    - "修改任何代码文件"
    - "创建 changelog"
    - "执行测试"

FE_domain:
  allowed:
    - "编写前端代码"
    - "渲染契约/数据"
    - "创建 FE changelog"
    - "维护 task.md 中 FE 条目"
  forbidden:
    - "修改 BE 代码"
    - "修改 API 契约文件"
    - "创建 BE changelog"
    - "创建/修改 Spec 文档"

BE_domain:
  allowed:
    - "编写后端代码"
    - "创建 BE changelog"
    - "修改契约文件（PM 未覆盖的情况）"
    - "维护 task.md 中 BE 条目"
  forbidden:
    - "修改前端代码"
    - "创建 FE changelog"
    - "创建/修改 Spec 文档"

QA_domain:
  allowed:
    - "执行测试"
    - "执行集成验证（verify_integration）"
    - "创建 bug issue"
    - "更新 test_registry.md"
  forbidden:
    - "修复 bug"
    - "编写 changelog"
    - "修改任何代码文件"
    - "创建/修改 Spec 文档"

---

# ============================================================================
# 6. BUG ROUTING —— 缺陷分发
# ============================================================================

bug_routing:
  fe_bug: "UI / 状态显示问题 → 指派 FE"
  be_bug: "逻辑 / API / DB / Redis → 指派 BE"
  contract_bug: "字段不一致 / 契约违背 → MUST 指派 BE"
  devops_bug: "环境 / Docker / 端口问题 → 指派 DevOps"

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
# END OF PROJECT RULES (L0)
# ============================================================================
