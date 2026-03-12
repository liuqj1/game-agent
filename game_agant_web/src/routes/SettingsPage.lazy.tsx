import { Settings, Moon, Sun, Monitor, Trash2, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

export default function SettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-display">设置</h1>
          <p className="text-muted-foreground">自定义您的体验</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle>外观</CardTitle>
            <CardDescription>自定义应用程序的外观</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-3 block">主题</label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  className="justify-start gap-2"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-4 w-4" />
                  浅色
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  className="justify-start gap-2"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-4 w-4" />
                  深色
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  className="justify-start gap-2"
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="h-4 w-4" />
                  跟随系统
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>数据管理</CardTitle>
            <CardDescription>管理您的本地数据和偏好设置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">导出数据</p>
                <p className="text-sm text-muted-foreground">将您的所有数据下载为JSON文件</p>
              </div>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                导出
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">导入数据</p>
                <p className="text-sm text-muted-foreground">从备份文件恢复数据</p>
              </div>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                导入
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">清除所有数据</p>
                <p className="text-sm text-muted-foreground">删除所有本地数据并重新开始</p>
              </div>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                清除
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>关于</CardTitle>
            <CardDescription>应用程序相关信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">AI游戏生成平台</p>
                <p className="text-sm text-muted-foreground">版本 1.0.0</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              AI游戏生成平台是一款强大的工具，帮助您使用自然语言创建游戏。
              描述您的游戏创意，见证它成为现实。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
