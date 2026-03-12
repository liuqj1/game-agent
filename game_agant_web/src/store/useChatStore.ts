import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, ChatSession } from '@/types';
import { chatApi } from '@/services/apiClient';

interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  currentInput: string;
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  setInput: (input: string) => void;
  clearMessages: () => void;
  createSession: (title: string) => string;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  fetchSessions: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isStreaming: false,
      currentInput: '',
      sessions: [],
      currentSessionId: null,
      isLoading: false,
      error: null,

      addMessage: (message: Message) => {
        set((state) => {
          const newMessages = [...state.messages, message];
          
          // Update session if exists
          if (state.currentSessionId) {
            const updatedSessions = state.sessions.map(session =>
              session.id === state.currentSessionId
                ? { ...session, messages: newMessages, updatedAt: Date.now() }
                : session
            );
            return { messages: newMessages, sessions: updatedSessions };
          }
          
          return { messages: newMessages };
        });
      },

      updateLastMessage: (content: string) => {
        set((state) => {
          if (state.messages.length === 0) return state;
          
          const updatedMessages = [...state.messages];
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          
          if (lastMessage && lastMessage.role === 'assistant') {
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              content,
            };
          }
          
          return { messages: updatedMessages };
        });
      },

      setStreaming: (streaming: boolean) => set({ isStreaming: streaming }),
      
      setInput: (input: string) => set({ currentInput: input }),
      
      clearMessages: () => set({ messages: [] }),

      createSession: (title: string) => {
        const newSession: ChatSession = {
          id: `session-${Date.now()}`,
          title,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id,
          messages: [],
        }));
        
        return newSession.id;
      },

      loadSession: (sessionId: string) => {
        const session = get().sessions.find(s => s.id === sessionId);
        if (session) {
          set({
            currentSessionId: sessionId,
            messages: session.messages,
          });
        }
      },

      deleteSession: (sessionId: string) => {
        set((state) => {
          const newSessions = state.sessions.filter(s => s.id !== sessionId);
          const newCurrentSessionId = state.currentSessionId === sessionId 
            ? (newSessions[0]?.id || null)
            : state.currentSessionId;
          
          return {
            sessions: newSessions,
            currentSessionId: newCurrentSessionId,
            messages: newCurrentSessionId 
              ? newSessions.find(s => s.id === newCurrentSessionId)?.messages || []
              : [],
          };
        });
      },

      // 从API获取会话列表
      fetchSessions: async () => {
        set({ isLoading: true, error: null });
        try {
          const sessions = await chatApi.getSessions();
          set({ sessions: sessions.map(s => ({
            ...s,
            messages: [],
            createdAt: new Date(s.createdAt).getTime(),
            updatedAt: new Date(s.createdAt).getTime(),
          })), isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // 发送消息到API
      sendMessage: async (content: string) => {
        const messages = get().messages;
        
        // 添加用户消息
        const userMessage: Message = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content,
          timestamp: Date.now(),
        };
        get().addMessage(userMessage);
        set({ currentInput: '' });
        
        // 创建AI消息占位
        const aiMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isStreaming: true,
        };
        get().addMessage(aiMessage);
        set({ isStreaming: true });

        try {
          // 调用API发送消息
          const allMessages = [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          }));
          
          await chatApi.sendMessage(allMessages, (chunk) => {
            const currentMessages = get().messages;
            const lastMsg = currentMessages[currentMessages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              get().updateLastMessage(lastMsg.content + chunk);
            }
          });

          // 完成流式响应
          set((state) => {
            const updatedMessages = [...state.messages];
            const lastMsg = updatedMessages[updatedMessages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMsg,
                isStreaming: false,
              };
            }
            return { messages: updatedMessages, isStreaming: false };
          });
        } catch (error) {
          set({ 
            error: (error as Error).message, 
            isStreaming: false,
            messages: get().messages.map((msg, i, arr) => 
              i === arr.length - 1 && msg.role === 'assistant'
                ? { ...msg, content: msg.content + '\n\n[Error: 消息发送失败]', isStreaming: false }
                : msg
            )
          });
        }
      },
    }),
    {
      name: 'ai-game-chat-storage',
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
      }),
    }
  )
);
