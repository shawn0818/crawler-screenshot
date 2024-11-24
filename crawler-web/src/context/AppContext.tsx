// src/context/AppContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useQueue } from '@/hooks/useQueue';
import { useAsyncWithError } from '@/hooks/useAsyncWithError';
import { usePrevious } from '@/hooks/usePrevious';
import { useToast } from '@/hooks/use-toast';
import type { Website, CrawlProgress } from '@/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface AppContextType {
  // 状态
  companies: string[];
  selectedWebsites: Website[];
  crawlProgress: CrawlProgress;
  currentStep: number;
  isConnected: boolean;
  isCrawling: boolean;
  queryDate: Date;
  
  // 操作方法
  setCompanies: (companies: string[]) => void;
  setSelectedWebsites: (websites: Website[]) => void;
  setCurrentStep: (step: number) => void;
  startCrawling: () => Promise<void>;
  retryCrawling: (taskIds: string[]) => Promise<void>;
  downloadResults: () => Promise<void>;
  setQueryDate: (date: Date) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // 使用优化后的 hooks
  const { handleError } = useAsyncWithError();
  const { toast } = useToast();
  const { isConnected, isCrawling, progress: crawlProgress, startCrawl, retryTasks } = useSocket();
  const { queue, add, retry, getStats } = useQueue({
    maxRetries: 3,
    maxConcurrent: 2
  });

  // 状态管理
  const [companies, setCompanies] = React.useState<string[]>([]);
  const [selectedWebsites, setSelectedWebsites] = React.useState<Website[]>([]);
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [queryDate, setQueryDate] = React.useState<Date>(new Date());

  // 监听上一步的状态
  const prevProgress = usePrevious(crawlProgress);

  // 当爬取完成时自动提示
  React.useEffect(() => {
    if (prevProgress && 
        crawlProgress.completed > prevProgress.completed &&
        crawlProgress.completed === crawlProgress.total) {
      toast({
        title: "爬取完成",
        description: `成功: ${crawlProgress.completed}, 失败: ${crawlProgress.failed}`,
      });
    }
  }, [crawlProgress, prevProgress, toast]);

  // 开始爬取
  const startCrawling = React.useCallback(async () => {
    try {
      if (companies.length === 0 || selectedWebsites.length === 0) {
        throw new Error('请先选择公司和网站');
      }

      // 添加到队列
      add(companies, selectedWebsites);
      
      // 开始爬取，加入日期参数
      await startCrawl({
        companies,
        websites: selectedWebsites,
        queryDate
      });

      toast({
        title: "开始爬取",
        description: "任务已开始执行",
      });
    } catch (error) {
      handleError(error);
    }
  }, [companies, selectedWebsites, queryDate, add, startCrawl, handleError, toast]);

  // 重试失败的任务
  const retryCrawling = React.useCallback(async (taskIds: string[]) => {
    try {
      // 更新任务队列状态
      taskIds.forEach(id => retry(id));
      // 重试爬取
      await retryTasks(taskIds);
      
      toast({
        title: "开始重试",
        description: `正在重试 ${taskIds.length} 个任务`,
      });
    } catch (error) {
      handleError(error);
    }
  }, [retry, retryTasks, handleError, toast]);

  // 下载结果
  const downloadResults = React.useCallback(async () => {
    if (isDownloading) {
      console.log('已经在下载中，请等待...');
      return;
    }

    try {
      setIsDownloading(true);
      console.log('开始下载流程');

      // 检查是否有可下载的文件
      if (crawlProgress.completed === 0) {
        throw new Error('没有可下载的结果');
      }

      console.log('发起下载请求:', `${SOCKET_URL}/api/download-results`);

      // 发起下载请求
      const response = await fetch(`${SOCKET_URL}/api/download-results`, {
        method: 'GET',
        headers: {
          'Accept': 'application/zip, application/octet-stream',
        },
      });

      console.log('收到响应:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      // 检查响应状态
      if (!response.ok) {
        let errorMessage = '下载失败';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `下载失败: HTTP ${response.status} - ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // 获取文件名
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'screenshots.zip';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      console.log('准备下载文件:', filename);

      // 检查响应类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/zip')) {
        console.warn('警告：响应类型不是 zip 文件:', contentType);
      }

      // 创建 blob 并下载
      const blob = await response.blob();
      console.log('文件大小:', blob.size, 'bytes');

      if (blob.size === 0) {
        throw new Error('下载的文件大小为0');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      
      console.log('触发下载');
      a.click();

      // 清理
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "下载完成",
        description: `文件已保存为: ${filename}`,
      });

      console.log('下载流程完成');

    } catch (error) {
      console.error('下载过程出错:', error);
      handleError(error);
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, crawlProgress.completed, handleError, toast]);

  const value = React.useMemo(() => ({
    // 状态
    companies,
    selectedWebsites,
    crawlProgress,
    currentStep,
    isConnected,
    isCrawling,
    queryDate,
    
    // 方法
    setCompanies,
    setSelectedWebsites,
    setCurrentStep,
    startCrawling,
    retryCrawling,
    downloadResults,
    setQueryDate,
  }), [
    companies,
    selectedWebsites,
    crawlProgress,
    currentStep,
    isConnected,
    isCrawling,
    queryDate,
    startCrawling,
    retryCrawling,
    downloadResults
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}