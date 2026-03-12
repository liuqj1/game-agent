import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Game, GameTemplate } from '@/types';

interface GameState {
  currentGame: Game | null;
  games: Game[];
  isGenerating: boolean;
  templates: GameTemplate[];
  
  setCurrentGame: (game: Game | null) => void;
  addGame: (game: Game) => void;
  updateGame: (id: string, updates: Partial<Game>) => void;
  deleteGame: (id: string) => void;
  setGenerating: (generating: boolean) => void;
}

// Mock templates data
const mockTemplates: GameTemplate[] = [
  {
    id: 'template-1',
    name: 'Classic Platformer',
    description: 'A retro-style platformer with jumping mechanics',
    type: 'platformer',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop',
    prompt: 'Create a classic 2D platformer game with multiple levels, jumping mechanics, and collectible items.',
  },
  {
    id: 'template-2',
    name: 'Puzzle Challenge',
    description: 'Brain-teasing puzzle levels',
    type: 'puzzle',
    thumbnail: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=400&h=300&fit=crop',
    prompt: 'Build a puzzle game with various difficulty levels, hint system, and time-based challenges.',
  },
  {
    id: 'template-3',
    name: 'Space Shooter',
    description: 'Fast-paced arcade shooter',
    type: 'shooter',
    thumbnail: 'https://images.unsplash.com/photo-1614730370307-b31639d4759e?w=400&h=300&fit=crop',
    prompt: 'Design an arcade space shooter with power-ups, enemy waves, and boss battles.',
  },
  {
    id: 'template-4',
    name: 'Racing Grand Prix',
    description: 'High-speed racing action',
    type: 'racing',
    thumbnail: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&h=300&fit=crop',
    prompt: 'Create a racing game with multiple tracks, different vehicles, and lap timers.',
  },
  {
    id: 'template-5',
    name: 'RPG Adventure',
    description: 'Epic role-playing journey',
    type: 'rpg',
    thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=300&fit=crop',
    prompt: 'Build an RPG with character progression, inventory system, and branching storylines.',
  },
  {
    id: 'template-6',
    name: 'Retro Arcade',
    description: 'Classic arcade fun',
    type: 'arcade',
    thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop',
    prompt: 'Create a retro arcade game with high scores, level progression, and satisfying gameplay.',
  },
];

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      currentGame: null,
      games: [],
      isGenerating: false,
      templates: mockTemplates,

      setCurrentGame: (game: Game | null) => set({ currentGame: game }),

      addGame: (game: Game) => set((state) => ({
        games: [game, ...state.games],
        currentGame: game,
      })),

      updateGame: (id: string, updates: Partial<Game>) => set((state) => ({
        games: state.games.map(game =>
          game.id === id ? { ...game, ...updates, updatedAt: Date.now() } : game
        ),
        currentGame: state.currentGame?.id === id
          ? { ...state.currentGame, ...updates, updatedAt: Date.now() }
          : state.currentGame,
      })),

      deleteGame: (id: string) => set((state) => ({
        games: state.games.filter(game => game.id !== id),
        currentGame: state.currentGame?.id === id ? null : state.currentGame,
      })),

      setGenerating: (generating: boolean) => set({ isGenerating: generating }),
    }),
    {
      name: 'ai-game-storage',
      partialize: (state) => ({
        games: state.games,
        templates: state.templates,
      }),
    }
  )
);
