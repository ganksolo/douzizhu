# Agent Project Template

这是一个可复用的 AI Agent 协作项目模板，包含完整的 L0-L3 Prompt 架构。

## 目录结构

```
agent-project-template/
├── .agent/
│   ├── config.yaml              # Agent 行为配置
│   └── prompts/                 # L1-L3 prompt 模板
│       ├── roles/               # L1: Role Prompts
│       ├── loaders/             # L2: Loader Prompts
│       └── actions/             # L3: Action Prompts
├── docs/
│   ├── roadmap.md               # 全局路线图
│   ├── contract/                # 契约层
│   │   ├── openapi.yaml         # SSOT
│   │   └── ws_events.md         # WebSocket 事件
│   ├── changelog/               # 统一变更日志
│   │   └── TEMPLATE.md          # changelog 模板
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
3. 根据项目需求修改 `project_rules.md`
4. 使用 `boot.md` 启动 Agent

## Prompt 命名约定

- **Roles**: `{project}.role.{fe|be|qa}`
- **Loaders**: `{project}.orch.{fe|be|qa}_loader`
- **Actions**: `{project}.action.{action_name}`
