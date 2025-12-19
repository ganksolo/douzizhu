# SPEC-000: 模板

> 这是 Spec 文档模板，用于定义 FE-BE 联动功能的接口契约和任务分配。
> 使用时复制此文件，重命名为 `SPEC-{序号}_{功能名称}.md`

## 需求来源

{用户原始需求描述，保持原文}

## 是否需要 Spec

- **判断结果**: 是
- **判断依据**: {FE 需要调用 BE 接口 / FE 需要监听 BE 事件 / ...}

---

## 接口定义

### REST API (如无则删除此节)

**POST /api/xxx**

Request:
```json
{
  "field1": "string (required, description)",
  "field2": "number (optional, default: 0)"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "resultField": "type"
  }
}
```

Error Responses:
- `400`: 参数错误
- `401`: 未授权
- `404`: 资源不存在

---

### WebSocket 事件 (如无则删除此节)

**Client → Server: `event_name`**

```json
{
  "field1": "string (required)",
  "field2": "number (optional)"
}
```

**Server → Client: `event_response`**

```json
{
  "field1": "string",
  "field2": "number",
  "timestamp": "number (Unix ms)"
}
```

**Server → Client: `event_error`**

```json
{
  "message": "string"
}
```

---

## FE 任务

> FE Agent 按此列表执行

- [ ] 创建 {Component} 组件
- [ ] 调用 API / 监听事件
- [ ] 处理响应数据
- [ ] 更新 UI 状态
- [ ] 错误处理

## BE 任务

> BE Agent 按此列表执行

- [ ] 实现 {Handler/Controller}
- [ ] 参数验证
- [ ] 业务逻辑
- [ ] 响应/广播
- [ ] 错误处理

---

## 验证标准

> QA Agent 按此验证

- [ ] {正常场景验证 1}
- [ ] {正常场景验证 2}
- [ ] {边界条件验证}
- [ ] {错误处理验证}

---

## 执行顺序

1. **BE Agent** 先实现后端接口/事件处理
2. **FE Agent** 对接前端调用
3. **QA Agent** 执行 `verify_integration` 验证

---

## 关联文档

- 契约更新: `docs/contract/openapi.yaml` 或 `docs/contract/ws_events.md`
- 任务追踪: `task.md#{task_id}`
