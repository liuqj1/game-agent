import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/useGameStore';
import type { GameTemplate } from '@/types';

const gameTypeLabels: Record<string, string> = {
  platformer: '平台跳跃',
  puzzle: '益智解谜',
  racing: '赛车竞速',
  shooter: '射击游戏',
  rpg: '角色扮演',
  adventure: '冒险探索',
  simulation: '模拟经营',
  arcade: '街机游戏',
};

const gameTypeColors: Record<string, string> = {
  platformer: 'bg-blue-500/20 text-blue-400',
  puzzle: 'bg-purple-500/20 text-purple-400',
  racing: 'bg-green-500/20 text-green-400',
  shooter: 'bg-red-500/20 text-red-400',
  rpg: 'bg-orange-500/20 text-orange-400',
  adventure: 'bg-yellow-500/20 text-yellow-400',
  simulation: 'bg-cyan-500/20 text-cyan-400',
  arcade: 'bg-pink-500/20 text-pink-400',
};

interface TemplateCardProps {
  template: GameTemplate;
  onSelect: (template: GameTemplate) => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 cursor-pointer" onClick={() => onSelect(template)}>
      <div className="aspect-video relative overflow-hidden">
        <img 
          src={template.thumbnail} 
          alt={template.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <Badge className={`absolute top-3 right-3 ${gameTypeColors[template.type]}`}>
          {gameTypeLabels[template.type]}
        </Badge>
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-lg group-hover:text-primary transition-colors">
          {template.name}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {template.description}
        </p>
      </CardContent>
      
      <CardFooter>
        <Button variant="secondary" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          使用模板
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export function TemplateGallery() {
  const navigate = useNavigate();
  const { templates, addGame } = useGameStore();

  const handleSelectTemplate = (template: GameTemplate) => {
    // Create a new game from the template
    const newGame = {
      id: `game-${Date.now()}`,
      name: template.name,
      description: template.description,
      type: template.type,
      status: 'draft' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    addGame(newGame);
    navigate(`/session/new?template=${template.id}`);
  };

  const featuredTemplates = templates.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          <span>预建游戏模板</span>
        </div>
        <h2 className="text-4xl font-bold font-display">
          选择<span className="gradient-text">模板</span>开始创作
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          从预建模板开始，根据你的需求进行定制。
          我们的AI将帮助你根据你的设想修改和完善游戏。
        </p>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <TemplateCard 
            key={template.id} 
            template={template} 
            onSelect={handleSelectTemplate}
          />
        ))}
      </div>

      {/* Featured Section */}
      <div className="mt-16">
        <h3 className="text-2xl font-bold font-display mb-6">精选模板</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredTemplates.map((template) => (
            <div 
              key={template.id}
              className="relative group overflow-hidden rounded-xl"
            >
              <img 
                src={template.thumbnail}
                alt={template.name}
                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <Badge className={`mb-2 ${gameTypeColors[template.type]}`}>
                  {gameTypeLabels[template.type]}
                </Badge>
                <h4 className="text-lg font-semibold">{template.name}</h4>
                <Button 
                  size="sm" 
                  className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleSelectTemplate(template)}
                >
                  立即开始
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
