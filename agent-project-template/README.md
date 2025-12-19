# Agent Project Template

这是一个可复用的 AI Agent 协作项目模板，包含完整的 L0-L3 Prompt 架构，支持 PM/FE/BE/QA 四种 Agent 协作。

## 核心特性

- **PM Agent** - 需求分析、Spec 生成、任务分配
- **FE Agent** - 前端开发
- **BE Agent** - 后端开发
- **QA Agent** - 测试验证、集成验证
- **Spec 层** - 解决 FE-BE 联调的接口约定问题

## 目录结构

```
agent-project-template/
├── .agent/
│   ├── config.yaml              # Agent 行为配置
│   └── prompts/                 # L1-L3 prompt 模板
│       ├── roles/               # L1: Role Prompts (PM, FE, BE, QA)
│       ├── loaders/             # L2: Loader Prompts
│       └── actions/             # L3: Action Prompts (10 actions)
├── docs/
│   ├── roadmap.md               # 全局路线图
│   ├── specs/                   # Spec 文档（FE-BE 联动）
│   │   └── SPEC-000_TEMPLATE.md
│   ├── contract/                # 契约层
│   │   ├── openapi.yaml         # SSOT
│   │   └── ws_events.md         # WebSocket 事件
│   ├── changelog/               # 统一变更日志
│   │   └── TEMPLATE.md
│   └── architecture.md          # 架构设计
├── boot.md                      # Agent 启动器
├── project_rules.md             # L0 宪法
├── task.md                      # 任务清单
└── scripts/
    └── gen-spec.js              # openapi → api_spec 生成器
```

## 快速开始

1. 复制此模板到新项目
2. 将 `.agent/prompts/` 导入 Langfuse
3. 修改 `.agent/config.yaml` 中的 `{project}` 为你的项目前缀
4. 根据项目需求修改 `project_rules.md`
5. 使用 `boot.md` 启动 Agent

## 推荐工作流

```
用户需求
    │
    ▼
>>> START AS: PM    ← 分析需求，生成 Spec（如需 FE-BE 联动）
    │
    ▼
>>> START AS: BE    ← 实现后端接口（按 Spec）
    │
    ▼
>>> START AS: FE    ← 实现前端对接（按 Spec）
    │
    ▼
>>> START AS: QA    ← 执行 verify_integration 验证集成
```

## Prompt 清单

### Roles (4)
| Prompt | 职责 |
|--------|------|
| `{project}.role.pm` | 需求分析、Spec 生成、任务分配 |
| `{project}.role.fe` | 前端开发 |
| `{project}.role.be` | 后端开发 |
| `{project}.role.qa` | 测试验证 |

### Loaders (4)
| Prompt | 说明 |
|--------|------|
| `{project}.orch.pm_loader` | PM Agent 上下文加载 |
| `{project}.orch.fe_loader` | FE Agent 上下文加载 |
| `{project}.orch.be_loader` | BE Agent 上下文加载 |
| `{project}.orch.qa_loader` | QA Agent 上下文加载 |

### Actions (10)
| Prompt | 适用 Agent | 说明 |
|--------|-----------|------|
| `action.write_spec` | PM | 生成 Spec 文档 |
| `action.dispatch_tasks` | PM | 分配任务给 FE/BE |
| `action.dev_feature_fe` | FE | 前端功能开发 |
| `action.fix_fe_bug` | FE | 前端 Bug 修复 |
| `action.dev_feature_be` | BE | 后端功能开发 |
| `action.fix_be_bug` | BE | 后端 Bug 修复 |
| `action.fix_contract_bug` | BE | 契约 Bug 修复 |
| `action.qa_verify` | QA | 功能验证 |
| `action.verify_integration` | QA | FE-BE 集成验证 |
| `action.do_dod` | ALL | DoD 检查 |

## Spec 使用指南

### 何时需要 Spec？
- FE 需要调用 BE 的 REST API
- FE 需要监听 BE 的 WebSocket 事件
- FE 和 BE 之间有数据交换

### 何时不需要 Spec？
- FE 纯 UI/交互（无后端调用）
- BE 纯内部逻辑（不暴露新接口）
