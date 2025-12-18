# Project Architecture

## 技术栈

| 层级 | 技术 |
|------|------|
| **Frontend** | React / Vue + TypeScript |
| **Backend** | NestJS + TypeORM |
| **Database** | MySQL + Redis |
| **Protocol** | REST API + WebSocket |

---

## 目录结构

```
project/
├── frontend/           # 前端应用
│   └── src/
├── backend/            # 后端应用
│   └── src/
├── docs/               # 文档
│   ├── roadmap.md
│   ├── contract/
│   └── changelog/
└── task.md             # 任务清单
```

---

## Agent 协作架构

```
┌─────────────────────────────────────────────────────────────┐
│                         L0: 项目宪法                          │
│                      project_rules.md                       │
└─────────────────────────────────────────────────────────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       ▼                      ▼                      ▼
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│   L1: FE    │        │   L1: BE    │        │   L1: QA    │
│   Role      │        │   Role      │        │   Role      │
└─────────────┘        └─────────────┘        └─────────────┘
       │                      │                      │
       ▼                      ▼                      ▼
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│  L2: FE     │        │  L2: BE     │        │  L2: QA     │
│  Loader     │        │  Loader     │        │  Loader     │
└─────────────┘        └─────────────┘        └─────────────┘
       │                      │                      │
       ▼                      ▼                      ▼
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│ L3: Actions │        │ L3: Actions │        │ L3: Actions │
│ dev_fe      │        │ dev_be      │        │ qa_verify   │
│ fix_fe_bug  │        │ fix_be_bug  │        │ do_dod      │
│ do_dod      │        │ fix_contract│        │             │
│             │        │ do_dod      │        │             │
└─────────────┘        └─────────────┘        └─────────────┘
```

---

## 数据流

```
User Request
     │
     ▼
┌─────────────┐
│   boot.md   │──────▶ 选择 Agent 类型
└─────────────┘
     │
     ▼
┌─────────────┐
│   Loader    │──────▶ 加载 L0 + L1 + Context
└─────────────┘
     │
     ▼
┌─────────────┐
│   Action    │──────▶ 执行具体任务
└─────────────┘
     │
     ▼
┌─────────────┐
│  Outputs    │──────▶ Code + Changelog + task.md
└─────────────┘
```

---

## 契约同步

```
openapi.yaml (SSOT)
      │
      │  npm run gen:spec
      ▼
api_spec.md (AI 可读)
```
