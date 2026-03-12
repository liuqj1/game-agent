import { useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MessageList } from '@/components/chat/MessageList';
import { InputArea } from '@/components/chat/InputArea';
import { useChatStore } from '@/store/useChatStore';
import { useGameStore } from '@/store/useGameStore';
import type { Message } from '@/types';
export default function SessionPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');
  
  const { 
    messages, 
    isStreaming, 
    currentInput,
    setInput,
    addMessage,
    updateLastMessage,
    setStreaming,
    createSession,
    loadSession
  } = useChatStore();
  
  const { templates, setGenerating } = useGameStore();
  
  // Load session or create new one
  useEffect(() => {
    if (id && id !== 'new') {
      loadSession(id);
    } else {
      createSession('New Game');
    }
  }, [id, createSession, loadSession]);
  
  // Handle template selection
  useEffect(() => {
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        // Add welcome message with template info
        const welcomeMessage: Message = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `Great choice! I've loaded the **${template.name}** template. ${template.description}\n\nYou can customize this template or start from scratch. What would you like to create?`,
          timestamp: Date.now(),
        };
        addMessage(welcomeMessage);
      }
    }
  }, [templateId, templates, addMessage]);
  
  // Simulate AI response
  const handleSendMessage = useCallback(async () => {
    if (!currentInput.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: currentInput,
      timestamp: Date.now(),
    };
    addMessage(userMessage);
    
    // Clear input and start streaming
    setInput('');
    setStreaming(true);
    setGenerating(true);
    
    // Simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Add AI response message
    const aiMessage: Message = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    addMessage(aiMessage);
    
    // Simulate streaming response
    const response = `I've created a game based on your description! Here's what I've generated:\n\n\`\`\`javascript\n// Game configuration\nconst gameConfig = {\n  name: "My Awesome Game",\n  type: "platformer",\n  difficulty: "medium"\n};\n\n// Player settings\nconst player = {\n  speed: 5,\n  jumpForce: 10,\n  health: 100\n};\n\`\`\`\n\nThis is just the beginning! You can continue refining your game by describing what changes you'd like to make.`;
    
    // Stream the response character by character
    for (let i = 0; i < response.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
      updateLastMessage(response.substring(0, i + 1));
    }
    
    // Finish streaming
    const finalMessages = useChatStore.getState().messages;
    const lastMsg = finalMessages[finalMessages.length - 1];
    if (lastMsg) {
      addMessage({
        ...lastMsg,
        isStreaming: false,
      });
    }
    
    setStreaming(false);
    setGenerating(false);
  }, [currentInput, addMessage, setInput, setStreaming, setGenerating, updateLastMessage]);
  
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={messages} 
          isStreaming={isStreaming}
        />
      </div>
      
      {/* Input Area */}
      <InputArea
        value={currentInput}
        onChange={setInput}
        onSend={handleSendMessage}
        isLoading={isStreaming}
        placeholder="Describe the game you want to create..."
      />
    </div>
  );
}
