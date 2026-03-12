# API 接口文档

## 基础配置

- **基础URL**: `http://localhost:3001/api`
- **环境变量**: `VITE_API_BASE_URL`
- **Content-Type**: `application/json`

---

## 1. 对话 API (Chat)

### 1.1 发送消息
```
POST /chat/message
```

**请求体**:
```json
{
  "messages": [
    { "role": "user", "content": "创建一个平台跳跃游戏" }
  ]
}
```

**响应** (流式):
```json
{
  "message": {
    "role": "assistant",
    "content": "这是AI的回复..."
  }
}
```

#### 高级模式：生成游戏时的多轮对话（推荐）
在"生成游戏"步骤中，聊天接口会返回更新后的游戏对象：

**请求体**:
```json
{
  "messages": [
    { "role": "user", "content": "把主角改成红色" },
    { "role": "assistant", "content": "好的，我已经把主角改成红色了" }
  ]
}
```

**响应**:
```json
{
  "message": {
    "role": "assistant",
    "content": "我已经帮你把主角的颜色改成红色了，你可以预览一下效果。如果还需要其他修改，请继续告诉我！"
  },
  "game": {
    "id": "game-123",
    "name": "我的平台跳跃游戏",
    "description": "一个有趣的平台跳跃游戏",
    "code": "// 更新后的游戏代码...",
    "status": "completed"
  }
}
```

### 1.2 创建会话
```
POST /chat/sessions
```

**请求体**:
```json
{
  "title": "新游戏"
}
```

**响应**:
```json
{
  "id": "session-123"
}
```

### 1.3 获取会话列表
```
GET /chat/sessions
```

**响应**:
```json
[
  {
    "id": "session-123",
    "title": "平台跳跃游戏",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### 1.4 获取会话历史
```
GET /chat/sessions/:sessionId
```

**响应**:
```json
[
  { "role": "user", "content": "你好", "timestamp": 1704067200000 },
  { "role": "assistant", "content": "你好！", "timestamp": 1704067201000 }
]
```

---

## 2. 游戏 API (Game)

### 2.1 生成游戏
```
POST /games/generate
```

**请求体**:
```json
{
  "type": "platformer",
  "prompt": "创建一个超级马里奥风格的游戏",
  "template": "template-1"
}
```

**响应**:
```json
{
  "id": "game-123",
  "name": "我的平台跳跃游戏",
  "description": "一个有趣的平台跳跃游戏",
  "code": "// 游戏代码...",
  "status": "generating"
}
```

### 2.2 获取游戏详情
```
GET /games/:gameId
```

**响应**:
```json
{
  "id": "game-123",
  "name": "我的游戏",
  "description": "游戏描述",
  "type": "platformer",
  "code": "// 游戏代码",
  "status": "completed",
  "previewUrl": "http://localhost:3001/preview/game-123",
  "screenshots": [
    "http://localhost:3001/screenshots/1.png"
  ],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 2.3 获取游戏列表
```
GET /games
```

**响应**:
```json
[
  {
    "id": "game-123",
    "name": "我的游戏",
    "status": "completed",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### 2.4 更新游戏
```
PUT /games/:gameId
```

**请求体**:
```json
{
  "name": "新名称",
  "code": "// 新代码"
}
```

### 2.5 删除游戏
```
DELETE /games/:gameId
```

---

## 3. 模板 API (Template)

### 3.1 获取所有模板
```
GET /templates
```

**响应**:
```json
[
  {
    "id": "template-1",
    "name": "经典平台跳跃",
    "description": "复古风格的平台跳跃游戏",
    "type": "platformer",
    "thumbnail": "http://localhost:3001/thumbnails/template-1.jpg"
  }
]
```

### 3.2 获取模板详情
```
GET /templates/:templateId
```

**响应**:
```json
{
  "id": "template-1",
  "name": "经典平台跳跃",
  "description": "复古风格的平台跳跃游戏",
  "type": "platformer",
  "thumbnail": "http://localhost:3001/thumbnails/template-1.jpg",
  "prompt": "创建一个经典平台跳跃游戏..."
}
```

---

## 4. 错误响应

所有错误响应格式:

```json
{
  "message": "错误信息",
  "code": "ERROR_CODE",
  "details": {}
}
```

### 常见状态码
- `200` - 成功
- `400` - 请求参数错误
- `401` - 未授权
- `404` - 资源不存在
- `500` - 服务器错误

---

## 5. 使用示例

```typescript
import { chatApi, gameApi, templateApi } from '@/services/apiClient';

// 发送消息
const response = await chatApi.sendMessage(
  [{ role: 'user', content: '创建一个赛车游戏' }],
  (chunk) => console.log(chunk)
);

// 生成游戏
const game = await gameApi.generateGame({
  type: 'racing',
  prompt: '街头赛车游戏'
});

// 获取模板
const templates = await templateApi.getTemplates();
```
