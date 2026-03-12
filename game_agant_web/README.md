# AI 游戏生成平台

一个现代化的、高性能的前端应用，用于AI驱动的游戏生成，采用 React 18+、TypeScript 和 Vite 构建。

## 功能特性

- **自然语言游戏创建**：用简单的英语描述你的游戏想法
- **即时生成**：使用先进的AI模型在几秒钟内生成可玩的游戏
- **虚拟滚动**：即使在长对话中也能保持流畅性能
- **代码分割**：通过懒加载路由和组件优化加载速度
- **响应式设计**：支持桌面、平板和手机设备
- **深色模式**：开箱即用的精美深色主题

## 技术栈

- **React 18+** - 现代React并发特性
- **TypeScript** - 类型安全开发
- **Vite** - 快速构建工具，带热更新
- **Tailwind CSS** - 实用优先的CSS框架
- **ShadCN UI** - 精美、可访问的组件
- **Zustand** - 轻量级状态管理
- **React Router DOM v6+** - 支持懒加载的路由
- **react-window** - 长列表虚拟滚动

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装

```bash
# 安装依赖
npm install
```

### 开发模式

```bash
# 启动开发服务器
npm run dev
```

### 构建生产版本

```bash
# 构建生产版本
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 项目结构

```
src/
├── components/
│   ├── ui/              # ShadCN UI组件
│   ├── chat/            # 聊天组件
│   ├── games/           # 游戏相关组件
│   └── layout/          # 布局组件
├── hooks/               # 自定义React Hooks
├── store/               # Zustand状态管理
├── routes/              # 路由页面（懒加载）
├── lib/                 # 工具函数
├── types/               # TypeScript类型定义
├── App.tsx              # 主应用组件
└── main.tsx             # 入口文件
```

## 性能优化

- **路由级代码分割**：每个页面按需加载
- **组件级懒加载**：重型组件在需要时加载
- **虚拟滚动**：聊天中仅渲染可见消息
- **图片懒加载**：图片在进入视口时加载

## 许可证

MIT
