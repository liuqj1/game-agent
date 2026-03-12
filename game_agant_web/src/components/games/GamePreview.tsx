import { useState } from 'react';
import { 
  Play, 
  Pause, 
  Code, 
  Image, 
  Download, 
  ExternalLink,
  Maximize2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Game } from '@/types';

interface GamePreviewProps {
  game: Game;
}

export function GamePreview({ game }: GamePreviewProps) {
  const [activeTab, setActiveTab] = useState('preview');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlay = () => {
    setIsLoading(true);
    setIsPlaying(true);
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1500);
  };

  const statusColors = {
    draft: 'secondary',
    generating: 'warning',
    completed: 'success',
    error: 'destructive'
  } as const;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-2xl">{game.name}</CardTitle>
          <p className="text-muted-foreground mt-1">{game.description}</p>
        </div>
        <Badge variant={statusColors[game.status]}>
          {game.status}
        </Badge>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview" className="gap-2">
              <Play className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" className="gap-2">
              <Code className="h-4 w-4" />
              Code
            </TabsTrigger>
            <TabsTrigger value="screenshots" className="gap-2">
              <Image className="h-4 w-4" />
              Screenshots
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading game...</p>
                  </div>
                </div>
              ) : isPlaying ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <p className="text-white">Game preview area</p>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                  <div className="text-center">
                    <Button size="lg" onClick={handlePlay} className="gap-2 glow">
                      <Play className="h-5 w-5" />
                      Play Game
                    </Button>
                  </div>
                </div>
              )}

              {/* Game controls overlay */}
              {isPlaying && (
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button variant="secondary" size="icon" onClick={() => setIsPlaying(false)}>
                    <Pause className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="icon">
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="code" className="mt-4">
            <ScrollArea className="h-[400px] rounded-lg">
              <pre className="code-block p-4 text-sm overflow-x-auto">
                <code>
                  {game.code || '// No code generated yet'}
                </code>
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="screenshots" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              {game.screenshots?.length ? (
                game.screenshots.map((screenshot, index) => (
                  <div key={index} className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={screenshot} 
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))
              ) : (
                <div className="col-span-2 flex items-center justify-center h-[200px] text-muted-foreground">
                  <p>No screenshots available</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button variant="outline" className="gap-2">
          <ExternalLink className="h-4 w-4" />
          Open in New Tab
        </Button>
      </CardFooter>
    </Card>
  );
}
