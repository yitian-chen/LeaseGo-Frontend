# 聊天室 WebSocket 接口文档

## 连接信息

| 项目 | 说明                                       |
|------|------------------------------------------|
| WebSocket URL | `ws://{host}:{port}/app/chat`            |
| 认证方式 | 通过 URL 参数传递 token                        |
| 示例连接 | `ws://localhost:8081/app/chat?token=...` |

---

## 消息格式

### 1. 发送私信（前端 → 后端）

**请求示例：**
```json
{
  "toId": 9,
  "message": "你好"
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| toId | Long | 接收者的用户 ID |
| message | String | 消息内容 |

---

### 2. 接收消息（后端 → 前端）

#### 普通消息响应

**接收示例：**
```json
{
  "system": false,
  "fromId": 8,
  "fromName": "chen",
  "message": "你好"
}
```

#### 系统消息（在线用户列表更新）

**接收示例：**
```json
{
  "system": true,
  "fromId": null,
  "fromName": "系统",
  "message": [
    {"nickname": "chen", "userId": 8},
    {"nickname": "bro", "userId": 9}
  ]
}
```

**触发场景：** 用户上线/下线时自动广播


## 注意事项

1. **连接认证**：必须在 WebSocket 连接 URL 中携带 `token` 查询参数
2. **消息回显**：发送消息后，服务端会自动返回一条自己的消息用于前端回显
3. **在线状态**：服务端会定期广播当前所有在线用户列表，前端可根据 `system` 判断并更新 UI
