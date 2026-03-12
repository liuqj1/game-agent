import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Gamepad2, 
  BookOpen, 
  Palette, 
  Rocket,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Loader2,
  Play,
  Code,
  RefreshCw,
  Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGameStore } from '@/store/useGameStore';
import { MessageList } from '@/components/chat/MessageList';
import { InputArea } from '@/components/chat/InputArea';
import type { GameTemplate, ArtAsset, Game, Message } from '@/types';
import { chatApi, gameApi, storyApi, type StoryGenerateResponse, type StoryChooseResponse } from '@/services/apiClient';

const steps = [
  { id: 1, title: '创建新游戏', icon: Sparkles, description: '给你的游戏起个名字' },
  { id: 2, title: '选择模板', icon: Gamepad2, description: '选择游戏类型模板' },
  { id: 3, title: '输入剧情', icon: BookOpen, description: '描述你的游戏故事' },
  { id: 4, title: '美术素材', icon: Palette, description: '添加角色和场景描述' },
  { id: 5, title: '生成游戏', icon: Rocket, description: 'AI 生成你的游戏' },
];

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
  platformer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  puzzle: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  racing: 'bg-green-500/20 text-green-400 border-green-500/30',
  shooter: 'bg-red-500/20 text-red-400 border-red-500/30',
  rpg: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  adventure: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  simulation: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  arcade: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

const artAssetTypes = [
  { value: 'character', label: '角色', placeholder: '描述游戏中的角色形象...' },
  { value: 'background', label: '场景', placeholder: '描述游戏背景和场景...' },
  { value: 'effect', label: '特效', placeholder: '描述技能或特效效果...' },
  { value: 'sound', label: '音效', placeholder: '描述背景音乐和音效...' },
  { value: 'other', label: '其他', placeholder: '其他美术素材描述...' },
];

export default function CreateWizardPage() {
  const navigate = useNavigate();
  const { templates, addGame, setGenerating } = useGameStore();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [gameName, setGameName] = useState('');
  const [gameDescription, setGameDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<GameTemplate | null>(null);
  const [story, setStory] = useState('');
  const [artAssets, setArtAssets] = useState<ArtAsset[]>([]);
  const [isGeneratingGame, setIsGeneratingGame] = useState(false);
  const [generatedGame, setGeneratedGame] = useState<Game | null>(null);
  
  // 聊天相关状态（第5步多轮对话）
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isFirstGenerate, setIsFirstGenerate] = useState(true);

  // 第3步：AI 交互式剧情生成状态
  const [storyRequirement, setStoryRequirement] = useState('');
  const [storyThreadId, setStoryThreadId] = useState<string | null>(null);
  const [storyMessages, setStoryMessages] = useState<Array<{ type: 'story' | 'choice'; content: string; choices?: string[] }>>([]);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [storyFinished, setStoryFinished] = useState(false);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return gameName.trim().length > 0;
      case 2:
        return selectedTemplate !== null;
      case 3:
        return story.trim().length > 0 || storyMessages.length > 0;
      case 4:
        return true; // 美术素材是可选的
      case 5:
        return true;
      default:
        return false;
    }
  };

  // 第3步：调用 /story/generate 生成初始剧情
  const handleGenerateStory = async () => {
    if (!storyRequirement.trim() || isGeneratingStory) return;
    setIsGeneratingStory(true);
    setStoryMessages([]);
    setStoryThreadId(null);
    setStoryFinished(false);
    try {
      const res = await storyApi.generate(storyRequirement.trim());
      setStoryThreadId(res.thread_id);
      setStoryMessages([{ type: 'story', content: res.content, choices: res.choices }]);
      if (res.is_finished) {
        setStoryFinished(true);
        setStory(res.content);
      }
    } catch (err) {
      console.error('剧情生成失败:', err);
      setStoryMessages([{ type: 'story', content: '（剧情生成失败，请手动填写或重试）', choices: [] }]);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  // 第3步：调用 /story/choose 推进剧情
  const handleStoryChoice = async (choiceIndex: number) => {
    if (!storyThreadId || isGeneratingStory) return;
    const lastMsg = storyMessages[storyMessages.length - 1];
    const choiceText = lastMsg?.choices?.[choiceIndex] ?? String(choiceIndex + 1);
    setStoryMessages(prev => [...prev, { type: 'choice', content: choiceText }]);
    setIsGeneratingStory(true);
    try {
      const res = await storyApi.choose(storyThreadId, String(choiceIndex + 1));
      setStoryThreadId(res.thread_id);
      setStoryMessages(prev => [...prev, { type: 'story', content: res.content, choices: res.choices }]);
      if (res.is_finished) {
        setStoryFinished(true);
        // 将完整对话拼接为 story 文本
        const fullStory = [...storyMessages, { type: 'choice' as const, content: choiceText }, { type: 'story' as const, content: res.content }]
          .filter(m => m.type === 'story')
          .map(m => m.content)
          .join('\n\n');
        setStory(fullStory);
      }
    } catch (err) {
      console.error('剧情选择失败:', err);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      // 离开第3步时，若用了 AI 生成但尚未结束，也把当前内容保存
      if (currentStep === 3 && storyMessages.length > 0 && !story) {
        const collectedStory = storyMessages
          .filter(m => m.type === 'story')
          .map(m => m.content)
          .join('\n\n');
        setStory(collectedStory);
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddArtAsset = (type: ArtAsset['type'], description: string) => {
    if (!description.trim()) return;
    const newAsset: ArtAsset = {
      id: `asset-${Date.now()}`,
      name: `${type}-${artAssets.filter(a => a.type === type).length + 1}`,
      type,
      description,
    };
    setArtAssets([...artAssets, newAsset]);
  };

  const handleRemoveArtAsset = (id: string) => {
    setArtAssets(artAssets.filter(a => a.id !== id));
  };

  // 构建生成游戏的 prompt
  const buildGeneratePrompt = useCallback(() => {
    const templateInfo = selectedTemplate ? `\n模板：${selectedTemplate.name} - ${selectedTemplate.description}` : '';
    const storyInfo = story ? `\n剧情设定：${story}` : '';
    const assetsInfo = artAssets.length > 0 ? `\n美术素材：${artAssets.map(a => `${a.type}: ${a.description}`).join('; ')}` : '';
    
    return `请根据以下信息生成一款游戏：\n游戏名称：${gameName}\n游戏描述：${gameDescription}${templateInfo}${storyInfo}${assetsInfo}`;
  }, [gameName, gameDescription, selectedTemplate, story, artAssets]);

  // 初次生成游戏
  const handleFirstGenerate = async () => {
    setIsGeneratingGame(true);
    setGenerating(true);
    
    const prompt = buildGeneratePrompt();
    
    // 添加用户消息
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };
    setChatMessages([userMessage]);
    
    try {
      // 调用后端 API 生成游戏
      const response = await gameApi.generateGame({
        type: selectedTemplate?.type,
        prompt,
        template: selectedTemplate?.id,
      });
      
      // 创建游戏对象
      const newGame: Game = {
        id: response.id || `game-${Date.now()}`,
        name: response.name || gameName,
        description: response.description || gameDescription,
        type: selectedTemplate?.type || 'arcade',
        status: response.status || 'completed',
        code: response.code,
        previewUrl: response.previewUrl,
        screenshots: response.screenshots,
        template: selectedTemplate || undefined,
        story,
        artAssets,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      // 添加 AI 消息（带游戏信息）
      const aiMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: `我已经为你生成了游戏「${newGame.name}」！你可以：\n1. 点击左侧预览体验游戏\n2. 告诉我需要修改的地方，我会帮你调整\n3. 比如："把主角改成红色"、"增加更多关卡"等`,
        timestamp: Date.now(),
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
      setGeneratedGame(newGame);
      addGame(newGame);
      setIsFirstGenerate(false);
    } catch (error) {
      console.error('生成游戏失败:', error);
      // 即使 API 失败，也生成一个本地模拟版本
      const mockGame: Game = {
        id: `game-${Date.now()}`,
        name: gameName,
        description: gameDescription,
        type: selectedTemplate?.type || 'arcade',
        status: 'completed',
        code: `// Generated game: ${gameName}\n// Template: ${selectedTemplate?.name}\n// Story: ${story}\n\nconsole.log("Game: ${gameName} started!");`,
        template: selectedTemplate || undefined,
        story,
        artAssets,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const aiMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: `（演示模式）我已经为你创建了游戏「${mockGame.name}」的预览版本。你可以告诉我需要修改的地方！`,
        timestamp: Date.now(),
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
      setGeneratedGame(mockGame);
      addGame(mockGame);
      setIsFirstGenerate(false);
    } finally {
      setIsGeneratingGame(false);
      setGenerating(false);
    }
  };

  // 发送聊天消息（多轮对话修改游戏）
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: chatInput,
      timestamp: Date.now(),
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);
    
    try {
      // 准备发送的消息历史（包含游戏上下文）
      const messagesWithContext = [
        ...chatMessages,
        userMessage,
      ];
      
      // 调用聊天 API（高级模式：返回包含 game 的响应）
      const response = await chatApi.sendMessage(
        messagesWithContext.map(m => ({ role: m.role, content: m.content }))
      ) as { message: { role: string; content: string }; game?: Game };
      
      const aiMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: response.message?.content || '好的，我已经处理了你的请求。',
        timestamp: Date.now(),
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
      
      // 如果后端返回了更新后的游戏，更新预览
      if (response.game) {
        setGeneratedGame(response.game);
        addGame(response.game);
      }
    } catch (error) {
      console.error('聊天请求失败:', error);
      // 模拟 AI 回复
      const aiMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: `（演示模式）好的，我会帮你把游戏改成：${chatInput}。游戏预览已更新，请查看左侧！`,
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">创建新游戏</h2>
              <p className="text-muted-foreground">给你的游戏起个有趣的名字，描述一下你想要什么样的游戏</p>
            </div>
            <Card className="max-w-xl mx-auto">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">游戏名称</label>
                  <Input
                    placeholder="例如：我的冒险游戏"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    className="text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">游戏描述</label>
                  <Textarea
                    placeholder="简单描述你想要的游戏类型和玩法..."
                    value={gameDescription}
                    onChange={(e) => setGameDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">选择游戏模板</h2>
              <p className="text-muted-foreground">选择一个基础模板，AI 会根据它来生成你的游戏</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    selectedTemplate?.id === template.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : ''
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="aspect-video relative overflow-hidden rounded-t-lg">
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                    {selectedTemplate?.id === template.id && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-2">
                          <Check className="h-6 w-6" />
                        </div>
                      </div>
                    )}
                  </div>
                  <CardContent className="pt-4">
                    <Badge className={`${gameTypeColors[template.type]} mb-2`}>
                      {gameTypeLabels[template.type]}
                    </Badge>
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">输入剧情</h2>
              <p className="text-muted-foreground">让 AI 为你生成互动剧情，或直接手动填写</p>
            </div>

            {/* AI 剧情生成区 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI 剧情生成
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="输入剧情方向，如：都市悬疑、奇幻冒险、末日求生..."
                    value={storyRequirement}
                    onChange={(e) => setStoryRequirement(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateStory()}
                    disabled={isGeneratingStory}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleGenerateStory}
                    disabled={!storyRequirement.trim() || isGeneratingStory}
                    className="shrink-0 gap-2"
                  >
                    {isGeneratingStory ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />生成中...</>
                    ) : (
                      <><Wand2 className="h-4 w-4" />生成剧情</>
                    )}
                  </Button>
                </div>

                {/* 剧情对话流 */}
                {storyMessages.length > 0 && (
                  <ScrollArea className="h-80 rounded-lg border border-border p-4 space-y-4">
                    <div className="space-y-4">
                      {storyMessages.map((msg, idx) => (
                        <div key={idx}>
                          {msg.type === 'story' ? (
                            <div className="space-y-3">
                              <div className="bg-secondary rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.content}
                              </div>
                              {/* 选项按钮 */}
                              {!storyFinished && msg.choices && msg.choices.length > 0 && idx === storyMessages.length - 1 && (
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground font-medium">选择剧情走向：</p>
                                  {msg.choices.map((choice, cIdx) => (
                                    <Button
                                      key={cIdx}
                                      variant="outline"
                                      className="w-full justify-start text-left h-auto py-2 px-3 text-sm"
                                      onClick={() => handleStoryChoice(cIdx)}
                                      disabled={isGeneratingStory}
                                    >
                                      <span className="font-semibold text-primary mr-2">{cIdx + 1}.</span>
                                      {choice}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex justify-end">
                              <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl px-4 py-2 text-sm max-w-[80%]">
                                {msg.content}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {isGeneratingStory && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          AI 正在续写剧情...
                        </div>
                      )}
                      {storyFinished && (
                        <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                          <Check className="h-4 w-4" />
                          剧情已完成，已自动保存
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* 手动填写区（始终可用） */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">手动填写剧情</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  placeholder={`例如：一个勇敢的战士踏上寻找失落神器的旅程...\n\n- 主角：骑士 Alex\n- 目标：找到五件神器\n- 结局：拯救王国`}
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  可以直接编辑 AI 生成的剧情，或从头手动填写
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">美术素材</h2>
              <p className="text-muted-foreground">描述你想要的角色、场景和特效（可选）</p>
            </div>
            
            <div className="max-w-2xl mx-auto space-y-6">
              {/* 现有素材列表 */}
              {artAssets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">已添加的素材</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {artAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex-1">
                          <Badge variant="outline" className="mb-1">
                            {artAssetTypes.find(t => t.value === asset.type)?.label}
                          </Badge>
                          <p className="text-sm">{asset.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveArtAsset(asset.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* 添加素材表单 */}
              {artAssetTypes.map((typeInfo) => (
                <Card key={typeInfo.value}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge variant="secondary">{typeInfo.label}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        placeholder={typeInfo.placeholder}
                        id={`input-${typeInfo.value}`}
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        onClick={() => {
                          const input = document.getElementById(`input-${typeInfo.value}`) as HTMLInputElement;
                          if (input) {
                            handleAddArtAsset(typeInfo.value as ArtAsset['type'], input.value);
                            input.value = '';
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">生成游戏</h2>
              <p className="text-muted-foreground">
                {isFirstGenerate 
                  ? '确认以下信息，AI 将为你生成游戏，你可以通过对话微调' 
                  : '通过右侧对话微调你的游戏，预览会实时更新'}
              </p>
            </div>

            {/* 摘要卡片 - 只有第一次生成时才显示完整 */}
            {isFirstGenerate && (
              <Card>
                <CardHeader>
                  <CardTitle>游戏信息摘要</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="text-muted-foreground">游戏名称</span>
                    <span className="font-semibold">{gameName}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="text-muted-foreground">游戏类型</span>
                    <Badge className={gameTypeColors[selectedTemplate?.type || 'arcade']}>
                      {gameTypeLabels[selectedTemplate?.type || 'arcade']}
                    </Badge>
                  </div>
                  <div className="border-b pb-3">
                    <span className="text-muted-foreground block mb-2">剧情概要</span>
                    <p className="text-sm">{story.substring(0, 150)}{story.length > 150 ? '...' : ''}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-2">美术素材</span>
                    <div className="flex flex-wrap gap-2">
                      {artAssets.length === 0 ? (
                        <span className="text-sm text-muted-foreground">未添加</span>
                      ) : (
                        artAssets.map((asset) => (
                          <Badge key={asset.id} variant="outline">
                            {artAssetTypes.find(t => t.value === asset.type)?.label}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 第一次生成时的按钮 */}
            {isFirstGenerate ? (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-6 text-center space-y-4">
                  {isGeneratingGame ? (
                    <>
                      <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                      <p className="text-lg font-medium">AI 正在生成你的游戏...</p>
                      <p className="text-sm text-muted-foreground">这可能需要几秒钟时间</p>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-12 w-12 mx-auto text-primary" />
                      <p className="text-lg font-medium">准备好生成你的游戏了吗？</p>
                      <p className="text-sm text-muted-foreground">生成后可以通过对话微调游戏</p>
                      <Button size="lg" onClick={handleFirstGenerate} className="glow">
                        <Sparkles className="mr-2 h-5 w-5" />
                        开始生成游戏
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* 生成后的左右布局 */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 左侧：游戏预览 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Play className="h-5 w-5" />
                      游戏预览
                    </h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleFirstGenerate}
                      disabled={isGeneratingGame}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      重新生成
                    </Button>
                  </div>
                  
                  {generatedGame && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                          <CardTitle className="text-xl">{generatedGame.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{generatedGame.description}</p>
                        </div>
                        <Badge variant={generatedGame.status === 'completed' ? 'default' : 'secondary'}>
                          {generatedGame.status}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <Tabs defaultValue="preview" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="preview" className="gap-2">
                              <Play className="h-4 w-4" />
                              预览
                            </TabsTrigger>
                            <TabsTrigger value="code" className="gap-2">
                              <Code className="h-4 w-4" />
                              代码
                            </TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="preview" className="mt-4">
                            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                <div className="text-center">
                                  <Button size="lg" className="gap-2 glow">
                                    <Play className="h-5 w-5" />
                                    试玩
                                  </Button>
                                  <p className="text-sm text-muted-foreground mt-2">
                                    点击预览你的游戏
                                  </p>
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="code" className="mt-4">
                            <ScrollArea className="h-[300px] rounded-lg">
                              <pre className="code-block p-4 text-sm overflow-x-auto">
                                <code>
                                  {generatedGame.code || '// 暂无代码'}
                                </code>
                              </pre>
                            </ScrollArea>
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* 右侧：对话窗口 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    与 AI 对话微调
                  </h3>
                  
                  <Card className="h-[500px] flex flex-col">
                    {/* 消息列表 */}
                    <div className="flex-1 overflow-hidden">
                      <MessageList 
                        messages={chatMessages} 
                        isStreaming={isChatLoading}
                      />
                    </div>
                    
                    {/* 输入区域 */}
                    <InputArea
                      value={chatInput}
                      onChange={setChatInput}
                      onSend={handleSendChatMessage}
                      isLoading={isChatLoading}
                      placeholder="描述你想修改的内容，如：'把主角改成红色'、'增加更多障碍物'..."
                    />
                  </Card>
                </div>
              </div>
            )}

            {/* 生成后的操作按钮 */}
            {!isFirstGenerate && generatedGame && (
              <div className="flex justify-center gap-4 pt-4">
                <Button onClick={() => navigate(`/session/${generatedGame.id}`)}>
                  开始游戏
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => navigate('/history')}>
                  查看我的游戏
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      {/* 步骤指示器 */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-green-500/20 text-green-500'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                    <span className="hidden sm:inline font-medium whitespace-nowrap">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-8 sm:w-16 h-0.5 mx-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 步骤内容 */}
      <div className="container mx-auto px-4 py-8">
        {renderStepContent()}
      </div>

      {/* 底部导航 */}
      {currentStep < 5 && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-card/80 backdrop-blur-sm p-4">
          <div className="container mx-auto flex justify-between max-w-4xl">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              上一步
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="glow"
            >
              下一步
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
