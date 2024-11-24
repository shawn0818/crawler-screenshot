// src/components/CrawlProgress.tsx
'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, RotateCw, Wifi } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import type { CrawlProgress as CrawlProgressType } from '@/types';

interface CrawlProgressProps {
  progress: CrawlProgressType;
  onRetry: (taskIds: string[]) => void;
  onDownload: () => void;
  isConnected: boolean;
  isCrawling: boolean;
}

export default function CrawlProgress({
  progress,
  onRetry,
  onDownload,
  isConnected,
  isCrawling
}: CrawlProgressProps) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const { toast } = useToast();
  const percentage = progress.total > 0 
    ? Math.round((progress.completed / progress.total) * 100) 
    : 0;

  const handleRetrySelected = async () => {
    if (selectedTasks.length === 0) {
      toast({
        variant: "destructive",
        title: "请选择要重试的任务",
      });
      return;
    }

    try {
      await onRetry(selectedTasks);
      setSelectedTasks([]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "重试失败",
        description: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSelectAllFailed = () => {
    const failedTasks = progress.tasks
      .filter(task => task.status === 'failed')
      .map(task => task.id);
    setSelectedTasks(failedTasks);
  };

  // 如果没有开始爬取，显示等待开始的界面
  if (!isCrawling && progress.total === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">查询进度</CardTitle>
            <div className={`flex items-center gap-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              <Wifi className="h-5 w-5" />
              <span className="text-sm">{isConnected ? '已连接' : '未连接'}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              {isConnected ? '请点击下方的"开始查询"按钮开始执行查询任务' : '正在连接到服务器...'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">查询进度</CardTitle>
            <div className={`flex items-center gap-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              <Wifi className="h-5 w-5" />
              <span className="text-sm">{isConnected ? '已连接' : '未连接'}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 进度概览 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="space-x-4">
                  <span className="text-green-600">成功: {progress.completed}</span>
                  <span className="text-red-600">失败: {progress.failed}</span>
                  <span className="text-gray-600">总数: {progress.total}</span>
                </div>
                <span className="font-medium">{percentage}%</span>
              </div>
              <Progress value={percentage} />
            </div>

            {/* 当前任务 */}
            {progress.currentTask && (
              <div className="rounded-md bg-muted p-4">
                <h3 className="text-sm font-medium mb-2">正在处理：</h3>
                <div className="text-sm space-y-1">
                  <p>公司：{progress.currentTask.company}</p>
                  <p>网站：{progress.currentTask.website.name}</p>
                </div>
              </div>
            )}

            {/* 失败任务列表 */}
            {progress.tasks.filter(task => task.status === 'failed').length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">失败的任务：</h3>
                  <div className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSelectAllFailed}
                      disabled={isCrawling}
                    >
                      全选失败
                    </Button>
                    {selectedTasks.length > 0 && (
                      <Button
                        size="sm"
                        onClick={handleRetrySelected}
                        disabled={isCrawling}
                      >
                        重试选中 ({selectedTasks.length})
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {progress.tasks
                    .filter(task => task.status === 'failed')
                    .map(task => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between rounded-md bg-red-50 p-3"
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task.id)}
                            onChange={() => handleSelectTask(task.id)}
                            disabled={isCrawling}
                            className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">
                                {task.company} - {task.website.name}
                              </span>
                            </div>
                            {task.error && (
                              <p className="text-xs text-red-600">{task.error}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-red-600">
                            重试次数: {task.retries}
                          </span>
                          <button
                            onClick={() => onRetry([task.id])}
                            disabled={isCrawling}
                            className="p-1 text-red-600 hover:text-red-700 rounded-full hover:bg-red-100"
                          >
                            <RotateCw className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 错误提示 */}
            {progress.failed > 0 && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-red-700">
                    失败: {progress.failed} 个任务
                  </span>
                </div>
              </div>
            )}

            {/* 成功任务统计 */}
            {progress.completed > 0 && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-700">
                    成功完成: {progress.completed} 个任务
                  </span>
                </div>
              </div>
            )}

            {/* 下载按钮 */}
            {progress.completed > 0 && !isCrawling && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={onDownload}
                  className="w-full md:w-auto"
                >
                  下载结果
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}