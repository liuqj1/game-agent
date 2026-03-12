export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface Game {
  id: string;
  name: string;
  description: string;
  type: GameType;
  status: 'draft' | 'generating' | 'completed' | 'error';
  code?: string;
  previewUrl?: string;
  screenshots?: string[];
  // 创建流程新增字段
  template?: GameTemplate;
  story?: string;
  artAssets?: ArtAsset[];
  createdAt: number;
  updatedAt: number;
}

// 创建流程中的美术素材
export interface ArtAsset {
  id: string;
  name: string;
  type: 'character' | 'background' | 'effect' | 'sound' | 'other';
  description: string;
  url?: string;
}

// 创建向导步骤数据
export interface CreateWizardData {
  step: number;
  gameName: string;
  gameDescription: string;
  template: GameTemplate | null;
  story: string;
  artAssets: ArtAsset[];
}

export type GameType = 
  | 'platformer' 
  | 'puzzle' 
  | 'racing' 
  | 'shooter' 
  | 'rpg' 
  | 'adventure' 
  | 'simulation'
  | 'arcade';

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface GameTemplate {
  id: string;
  name: string;
  description: string;
  type: GameType;
  thumbnail: string;
  prompt: string;
}
