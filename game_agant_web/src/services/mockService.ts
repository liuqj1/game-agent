/**
 * 模拟 API 服务
 * 用于开发测试，无需后端即可运行
 */

import type { Game, GameTemplate } from '@/types';

// 模拟延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 模拟游戏模板数据
const mockTemplates: GameTemplate[] = [
  {
    id: 'template-1',
    name: '经典平台跳跃',
    description: '复古风格的平台跳跃游戏',
    type: 'platformer',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop',
    prompt: '创建一个经典平台跳跃游戏...',
  },
  {
    id: 'template-2',
    name: '益智解谜',
    description: '脑力挑战解谜关卡',
    type: 'puzzle',
    thumbnail: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=400&h=300&fit=crop',
    prompt: '构建一个益智游戏...',
  },
  {
    id: 'template-3',
    name: '太空射击',
    description: '快节奏街机射击游戏',
    type: 'shooter',
    thumbnail: 'https://images.unsplash.com/photo-1614730370307-b31639d4759e?w=400&h=300&fit=crop',
    prompt: '设计一个街机太空射击游戏...',
  },
  {
    id: 'template-4',
    name: '赛车竞速',
    description: '高速赛车体验',
    type: 'racing',
    thumbnail: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&h=300&fit=crop',
    prompt: '创建赛车游戏...',
  },
  {
    id: 'template-5',
    name: '角色扮演',
    description: '史诗角色扮演冒险',
    type: 'rpg',
    thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=300&fit=crop',
    prompt: '构建RPG游戏...',
  },
  {
    id: 'template-6',
    name: '街机游戏',
    description: '经典街机乐趣',
    type: 'arcade',
    thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop',
    prompt: '创建复古街机游戏...',
  },
];

// 模拟AI回复
const mockAIResponse = (userMessage: string): string => {
  const responses = [
    `我已经理解了您的需求！根据您描述的"${userMessage}"，让我为您创建一个游戏。\n\n\`\`\`javascript\n// 游戏配置\nconst gameConfig = {\n  name: "My Awesome Game",\n  type: "platformer",\n  difficulty: "medium",\n  levels: 10\n};\n\n// 玩家设置\nconst player = {\n  speed: 5,\n  jumpForce: 10,\n  health: 100,\n  maxLives: 3\n};\n\n// 关卡数据\nconst levels = [\n  { id: 1, name: "开始", difficulty: "easy" },\n  { id: 2, name: "挑战", difficulty: "medium" },\n  { id: 3, name: "终极", difficulty: "hard" }\n];\n\`\`\`\n\n这是一个开始！您想对游戏做哪些修改？`,
    `太棒了！我已经为您生成了一个游戏框架。您可以通过以下方式继续完善：\n\n1. **添加新功能** - 描述您想要的功能\n2. **修改设置** - 调整游戏参数\n3. **添加内容** - 创建新的关卡或角色\n\n请问您想如何继续？`,
    `游戏创建成功！🎮\n\n我已经基于您的描述生成了基础游戏代码。您可以：\n\n- 查看右侧的代码预览\n- 点击"运行"测试游戏\n- 继续描述更多需求\n\n有什么需要修改的吗？`,
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};

// 模拟API实现
export const mockApi = {
  // 对话API
  chat: {
    sendMessage: async (
      messages: Array<{ role: string; content: string }>, 
      onChunk?: (chunk: string) => void
    ) => {
      await delay(500); // 模拟网络延迟
      
      const lastMessage = messages[messages.length - 1];
      const response = mockAIResponse(lastMessage.content);
      
      // 模拟流式输出
      if (onChunk) {
        for (let i = 0; i < response.length; i++) {
          await delay(20);
          onChunk(response[i]);
        }
      }
      
      return { message: { role: 'assistant', content: response } };
    },
    
    createSession: async (_title: string) => {
      await delay(200);
      return { id: `session-${Date.now()}` };
    },
    
    getSessions: async () => {
      await delay(300);
      return [];
    },
    
    getSessionHistory: async (_sessionId: string) => {
      await delay(200);
      return [];
    },
  },
  
  // 游戏API
  game: {
    generateGame: async (params: {
      type?: string;
      prompt: string;
      template?: string;
    }) => {
      await delay(1500); // 模拟生成时间
      
      return {
        id: `game-${Date.now()}`,
        name: `${params.type || '我的'}游戏`,
        description: params.prompt.substring(0, 50),
        code: `// 游戏代码\nconst game = new Game(${params.type || 'default'});\ngame.start();`,
        status: 'completed',
        previewUrl: '/preview/game.html',
        screenshots: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    
    getGame: async (gameId: string) => {
      await delay(300);
      return {
        id: gameId,
        name: '示例游戏',
        description: '这是一个示例游戏',
        code: '// 游戏代码',
        status: 'completed',
      };
    },
    
    getGames: async () => {
      await delay(300);
      return [];
    },
    
    updateGame: async (_gameId: string, _updates: Partial<Game>) => {
      await delay(300);
      return { success: true };
    },
    
    deleteGame: async (_gameId: string) => {
      await delay(200);
      return { success: true };
    },
  },
  
  // 模板API
  template: {
    getTemplates: async () => {
      await delay(300);
      return mockTemplates;
    },
    
    getTemplate: async (templateId: string) => {
      await delay(200);
      const template = mockTemplates.find(t => t.id === templateId);
      if (!template) {
        throw new Error('模板不存在');
      }
      return template;
    },
  },
};

export default mockApi;
