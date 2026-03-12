import { useNavigate } from 'react-router-dom';
import { History, Trash2, MessageSquare, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useChatStore } from '@/store/useChatStore';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { sessions, loadSession, deleteSession } = useChatStore();
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return '今天';
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString();
    }
  };
  const handleLoadSession = (sessionId: string) => {
    loadSession(sessionId);
    navigate(`/session/${sessionId}`);
  };
  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    deleteSession(sessionId);
  };
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-primary/10">
          <History className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-display">历史记录</h1>
          <p className="text-muted-foreground">查看和管理您之前的对话</p>
        </div>
      </div>
      {sessions.length === 0 ? (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">暂无对话</h3>
            <p className="text-muted-foreground mb-6">
              开始新对话来创建您的第一个游戏
            </p>
            <Button onClick={() => navigate('/session/new')}>
              开始新对话
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="max-w-2xl mx-auto space-y-4">
          {sessions.map((session) => (
            <Card 
              key={session.id}
              className="cursor-pointer hover:border-primary/50 transition-colors group"
              onClick={() => handleLoadSession(session.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{session.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {session.messages.length > 0 
                        ? session.messages[session.messages.length - 1]?.content.substring(0, 100)
                        : '空对话'
                      }
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{formatDate(session.updatedAt)}</span>
                      <span>{session.messages.length} 条消息</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => handleDeleteSession(e, session.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
