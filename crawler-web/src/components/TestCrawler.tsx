// src/components/TestCrawler.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CrawlerEngine } from '@/lib/crawlerEngine';
import type { CrawlProgress } from '@/types';

// 测试数据
const TEST_COMPANIES = ['洛阳国裕投资发展集团有限公司'];
const TEST_WEBSITES = [
  {
    category: '证券监督管理平台',
    name: '证券期货市场失信记录查询平台',
    homeUrl: 'https://neris.csrc.gov.cn/shixinchaxun/',
    searchInputSelector: '.ivu-input.ivu-input-default',
    searchButtonSelector: '.searchBtn',
    resultsSelector: '.titlesBg',
    needsNavigation: true,
    needsCaptcha: true,
  }
];

export function TestCrawler() {
  const [progress, setProgress] = useState<CrawlProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    tasks: [],
    currentTask: null
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleTest = async () => {
    setIsProcessing(true);
    const engine = new CrawlerEngine((progress) => {
      setProgress(progress);
      console.log('Progress update:', progress);
    });

    try {
      await engine.startCrawling(TEST_COMPANIES, TEST_WEBSITES);
      
      const blob = await engine.downloadResults();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `测试结果_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "测试完成",
        description: "结果已下载",
      });
    } catch (error) {
      console.error('Test failed:', error);
      toast({
        variant: "destructive",
        title: "测试失败",
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto my-8">
      <CardHeader>
        <CardTitle>爬虫测试</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div>测试公司：{TEST_COMPANIES.join(', ')}</div>
          <div>测试网站：{TEST_WEBSITES.map(w => w.name).join(', ')}</div>
        </div>

        <div className="space-y-2">
          <div>进度：{progress.completed}/{progress.total}</div>
          <div>失败：{progress.failed}</div>
          {progress.currentTask && (
            <div>当前任务：{progress.currentTask.company} - {progress.currentTask.website.name}</div>
          )}
        </div>

        <Button 
          onClick={handleTest} 
          disabled={isProcessing}
        >
          {isProcessing ? '测试中...' : '开始测试'}
        </Button>
      </CardContent>
    </Card>
  );
}