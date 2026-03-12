import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  MessageSquare, 
  Gamepad2, 
  Zap, 
  ArrowRight,
  BookOpen,
  Palette,
  Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Gamepad2,
      title: '选择模板',
      description: '从丰富的游戏模板库中选择你的游戏类型。',
    },
    {
      icon: BookOpen,
      title: '编写剧情',
      description: '描述你的游戏故事、角色和世界观设定。',
    },
    {
      icon: Palette,
      title: '添加素材',
      description: '描述你想要的角色形象、场景和特效。',
    },
    {
      icon: Rocket,
      title: 'AI生成',
      description: 'AI根据你的描述生成完整的可玩游戏。',
    },
  ];

  const stats = [
    { value: '10K+', label: '游戏已创建' },
    { value: '50K+', label: '活跃用户' },
    { value: '100+', label: '游戏模板' },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-20">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <Badge variant="secondary" className="px-4 py-1.5 text-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              AI驱动的游戏创作
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold font-display leading-tight">
              用 <span className="gradient-text">AI</span> 创造精彩游戏
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              用自然语言描述你的游戏想法，见证它成为现实。无需编程，只需你的想象力。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 glow"
                onClick={() => navigate('/create')}
              >
                开始创作
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="text-lg px-8 py-6"
                onClick={() => navigate('/templates')}
              >
                浏览模板
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-12 mt-16">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
            工作原理
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            只需五步，创建专业游戏
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="group hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 border-primary/30">
          <CardContent className="py-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
              准备好创造你的梦想游戏了吗？
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              加入成千上万使用AI创作精彩游戏的创作者行列。今天就开始你的旅程吧。
            </p>
            <Button 
              size="lg" 
              className="text-lg px-8 glow-accent"
              onClick={() => navigate('/create')}
            >
              <Sparkles className="mr-2 h-5 w-5" />
              创建你的第一个游戏
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold">AI游戏生成平台</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">隐私政策</a>
              <a href="#" className="hover:text-foreground transition-colors">服务条款</a>
              <a href="#" className="hover:text-foreground transition-colors">联系我们</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
