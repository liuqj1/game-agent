/**
 * API 客户端配置
 * 用于与后端服务通信
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = config;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '请求失败' }));
    throw new ApiError(response.status, error.message || '请求失败');
  }

  return response.json();
}

// 对话相关 API
export const chatApi = {
  // 发送消息并获取流式响应
  sendMessage: async (messages: Array<{ role: string; content: string }>, onChunk?: (chunk: string) => void) => {
    const response = await fetch(`${API_BASE_URL}/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error('发送消息失败');
    }

    if (onChunk && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        onChunk(text);
      }
    }

    return response.json();
  },

  // 创建新会话
  createSession: (title: string) =>
    request<{ id: string }>('/chat/sessions', {
      method: 'POST',
      body: { title },
    }),

  // 获取会话列表
  getSessions: () =>
    request<Array<{ id: string; title: string; createdAt: string }>>('/chat/sessions'),

  // 获取会话历史
  getSessionHistory: (sessionId: string) =>
    request<Array<{ role: string; content: string; timestamp: number }>>(
      `/chat/sessions/${sessionId}`
    ),
};

// 游戏相关 API
export const gameApi = {
  // 生成游戏
  generateGame: async (
    params: {
      type?: string;
      prompt: string;
      template?: string;
    }
  ) => {
    const response = await fetch(`${API_BASE_URL}/games/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('游戏生成失败');
    }

    return response.json();
  },

  // 获取游戏详情
  getGame: (gameId: string) => request<{
    id: string;
    name: string;
    code: string;
    status: string;
  }>(`/games/${gameId}`),

  // 获取游戏列表
  getGames: () =>
    request<Array<{
      id: string;
      name: string;
      status: string;
      createdAt: string;
    }>>('/games'),

  // 更新游戏
  updateGame: (gameId: string, updates: Partial<{ name: string; code: string }>) =>
    request(`/games/${gameId}`, {
      method: 'PUT',
      body: updates,
    }),

  // 删除游戏
  deleteGame: (gameId: string) =>
    request(`/games/${gameId}`, { method: 'DELETE' }),
};

// 剧情相关 API
export interface StoryGenerateResponse {
  thread_id: string;
  content: string;
  choices: string[];
  is_finished?: boolean;
}

export interface StoryChooseResponse {
  thread_id: string;
  content: string;
  choices: string[];
  is_finished?: boolean;
}

export const storyApi = {
  // 根据需求生成初始剧情（返回 thread_id + 内容 + 选项）
  generate: (requirement: string) =>
    request<StoryGenerateResponse>('/story/generate', {
      method: 'POST',
      body: { requirement },
    }),

  // 根据用户选择推进剧情
  choose: (thread_id: string, user_choice: string) =>
    request<StoryChooseResponse>('/story/choose', {
      method: 'POST',
      body: { thread_id, user_choice },
    }),
};

// 模板相关 API
export const templateApi = {
  // 获取所有模板
  getTemplates: () =>
    request<Array<{
      id: string;
      name: string;
      description: string;
      type: string;
      thumbnail: string;
    }>>('/templates'),

  // 获取模板详情
  getTemplate: (templateId: string) =>
    request<{
      id: string;
      name: string;
      description: string;
      type: string;
      thumbnail: string;
      prompt: string;
    }>(`/templates/${templateId}`),
};

export { ApiError };
export default {
  chat: chatApi,
  game: gameApi,
  template: templateApi,
  story: storyApi,
};
