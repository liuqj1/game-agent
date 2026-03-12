import { useRef, useEffect, useCallback, useState } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { MessageBubble } from './MessageBubble';
import type { Message } from '@/types';

interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
  }, [messages.length]);

  // Row renderer for virtual list
  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
    const message = messages[index];
    return (
      <div style={style}>
        <MessageBubble message={message} />
      </div>
    );
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">开始一段对话</p>
          <p className="text-sm">描述你想创建的游戏</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden">
      {dimensions.height > 0 && (
        <List
          ref={listRef}
          height={dimensions.height}
          width={dimensions.width}
          itemCount={messages.length}
          itemSize={100}
          itemData={messages}
          overscanCount={5}
        >
          {Row}
        </List>
      )}
      
      {/* Streaming indicator */}
      {isStreaming && (
        <div className="flex items-center justify-center p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm">AI正在思考...</span>
          </div>
        </div>
      )}
    </div>
  );
}
