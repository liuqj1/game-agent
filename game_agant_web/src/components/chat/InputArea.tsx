import { useRef, KeyboardEvent } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function InputArea({
  value,
  onChange,
  onSend,
  isLoading = false,
  placeholder = "描述你想创建的游戏..."
}: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!value.trim() || isLoading) return;
    onSend();
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-2 p-2 rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background transition-all">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isLoading}
            />
          </div>
          
          <Button
            onClick={handleSend}
            disabled={!value.trim() || isLoading}
            size="icon"
            className={cn(
              "h-10 w-10 shrink-0 transition-all",
              value.trim() && !isLoading && "glow"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>AI可能会犯错，请核实重要信息。</span>
        </div>
      </div>
    </div>
  );
}
