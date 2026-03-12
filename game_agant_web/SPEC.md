# AI游戏生成平台 - 前端架构设计文档

## 1. 项目概述

**项目名称**: AI Game Generator Platform  
**项目类型**: Web应用 (SPA)  
**核心功能**: 对话式AI游戏生成平台，用户通过自然语言描述生成游戏内容  
**目标用户**: 游戏开发者、创意设计师、AI爱好者

---

## 2. 技术栈

| 类别 | 技术选型 | 版本要求 |
|------|----------|----------|
| 核心框架 | React | 18+ |
| UI组件库 | ShadCN UI + Radix UI + Tailwind CSS | 最新版 |
| 状态管理 | Zustand | 4+ |
| 路由管理 | React Router DOM | 6+ |
| 构建工具 | Vite | 5+ |
| 虚拟滚动 | react-window | 1.8+ |
| 类型安全 | TypeScript | 5+ |

---

## 3. UI/UX 设计规范

### 3.1 布局结构

**主布局**
- 固定顶部导航栏 (高度: 64px)
- 左侧边栏 (宽度: 280px, 可折叠)
- 主内容区域 (响应式)
- 底部无固定元素

**响应式断点**
- 移动端: < 640px (单列布局)
- 平板: 640px - 1024px (双列布局)
- 桌面: > 1024px (完整三列布局)

### 3.2 视觉设计

**色彩系统**
```css
--background: #0a0a0f
--foreground: #fafafa
--card: #12121a
--card-foreground: #fafafa
--primary: #6366f1 (Indigo)
--primary-foreground: #ffffff
--secondary: #1e1e2e
--secondary-foreground: #a1a1aa
--muted: #27272a
--muted-foreground: #71717a
--accent: #8b5cf6 (Violet)
--accent-foreground: #ffffff
--destructive: #ef4444
--border: #27272a
--ring: #6366f1
--success: #22c55e
--warning: #f59e0b
```

**字体系统**
- 主字体: Inter, system-ui, sans-serif
- 代码字体: JetBrains Mono, monospace
- 标题字体: Space Grotesk, sans-serif

**字号规范**
- h1: 2.5rem (40px), font-weight: 700
- h2: 2rem (32px), font-weight: 600
- h3: 1.5rem (24px), font-weight: 600
- body: 1rem (16px), font-weight: 400
- small: 0.875rem (14px), font-weight: 400

**间距系统**
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

**视觉效果**
- 卡片阴影: 0 4px 6px -1px rgba(0, 0, 0, 0.3)
- 焦点环: 0 0 0 2px var(--ring)
- 过渡动画: 150ms ease-in-out
- 玻璃态效果: backdrop-blur-xl bg-opacity-80

### 3.3 组件清单

**基础UI组件**
- Button (变体: default, secondary, ghost, link, destructive)
- Input
- Textarea
- Card
- Badge
- Avatar
- ScrollArea
- Separator
- Tooltip
- Dropdown Menu
- Dialog
- Tabs

**业务组件**
- MessageBubble (用户/AI消息)
- MessageList (虚拟滚动)
- InputArea (输入框 + 发送按钮)
- GamePreview (游戏预览)
- TemplateGallery (模板库)
- ChatSidebar (会话列表)
- NavBar (顶部导航)

---

## 4. 功能模块

### 4.1 路由结构

```
/                       -> HomePage (首页)
/session/:id           -> SessionPage (会话页)
/history               -> HistoryPage (历史页)
/templates             -> TemplatesPage (模板页)
/settings              -> SettingsPage (设置页)
```

### 4.2 状态管理

**useChatStore**
```typescript
interface ChatState {
  messages: Message[]
  isStreaming: boolean
  currentInput: string
  addMessage: (message: Message) => void
  setStreaming: (streaming: boolean) => void
  setInput: (input: string) => void
  clearMessages: () => void
}
```

**useGameStore**
```typescript
interface GameState {
  currentGame: Game | null
  games: Game[]
  isGenerating: boolean
  setCurrentGame: (game: Game) => void
  addGame: (game: Game) => void
  setGenerating: (generating: boolean) => void
}
```

### 4.3 核心功能

1. **对话系统**
   - 流式响应显示
   - 代码高亮渲染
   - 消息复制功能
   - Markdown支持

2. **虚拟滚动**
   - 可变高度行支持
   - 滚动位置记忆
   - 懒加载触发

3. **游戏预览**
   - 实时预览
   - 截图展示
   - 代码查看

---

## 5. 性能优化

### 5.1 代码分割策略

- 路由级别: 每个页面独立chunk
- 组件级别: 非首屏组件懒加载
- 库级别: 大型库动态导入

### 5.2 资源优化

- 图片懒加载 (Intersection Observer)
- 字体子集化
- Gzip/Brotli压缩

### 5.3 虚拟滚动配置

```typescript
const ITEM_HEIGHT = 80; // 估算平均消息高度
const OVERSCAN_COUNT = 5; // 预渲染行数
```

---

## 6. 目录结构

```
src/
├── components/
│   ├── ui/              # ShadCN基础组件
│   ├── chat/            # 聊天组件
│   │   ├── MessageList/
│   │   ├── MessageBubble/
│   │   └── InputArea/
│   ├── games/          # 游戏组件
│   │   ├── GamePreview/
│   │   └── TemplateGallery/
│   └── layout/         # 布局组件
│       ├── NavBar/
│       └── Sidebar/
├── hooks/               # 自定义Hooks
│   ├── useVirtualScroll.ts
│   ├── useDebounce.ts
│   └── useLocalStorage.ts
├── store/               # Zustand状态
│   ├── useChatStore.ts
│   └── useGameStore.ts
├── routes/              # 路由配置
│   ├── HomePage.lazy.tsx
│   ├── SessionPage.lazy.tsx
│   ├── HistoryPage.lazy.tsx
│   ├── TemplatesPage.lazy.tsx
│   └── routes.tsx
├── services/            # API服务
│   └── apiClient.ts
├── lib/                 # 工具库
│   ├── utils.ts
│   └── cn.ts
├── types/               # TypeScript类型
│   └── index.ts
├── App.tsx
├── main.tsx
└── index.css
```

---

## 7. 验收标准

### 功能验收
- [ ] 所有路由正常跳转
- [ ] 消息发送与接收正常
- [ ] 虚拟滚动流畅运行
- [ ] 状态持久化生效

### 性能验收
- [ ] 首屏加载 < 2s
- [ ] 虚拟滚动无卡顿
- [ ] 代码分割正常

### UI验收
- [ ] 响应式布局正常
- [ ] 主题色正确应用
- [ ] 动画过渡流畅

---

## 8. 开发规范

1. 组件使用 `function` 声明，配合 Hooks
2. 组件文件使用 PascalCase 命名
3. Hooks 使用 `use` 前缀
4. 类型定义独立到 types/ 目录
5. 常量使用 UPPER_SNAKE_CASE
6. CSS类名使用 Tailwind CSS
