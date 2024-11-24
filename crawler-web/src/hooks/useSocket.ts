// src/hooks/useSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAsyncWithError } from './useAsyncWithError';
import type { CrawlProgress, Website, CrawlConfig } from '@/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [progress, setProgress] = useState<CrawlProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    tasks: [],
    currentTask: null
  });

  const socketRef = useRef<Socket | null>(null);
  const { handleError, run } = useAsyncWithError();

  useEffect(() => {
    // 初始化 Socket 连接
    try {
      socketRef.current = io(SOCKET_URL, {
        reconnectionDelay: 1000,
        reconnection: true,
        reconnectionAttempts: 10,
        transports: ['websocket'],
        agent: false,
        upgrade: false,
        rejectUnauthorized: false
      });

      // 连接事件处理
      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      // 进度更新处理
      socketRef.current.on('crawlProgress', (progressData: CrawlProgress) => {
        console.log('Progress update:', progressData);
        setProgress(progressData);
      });

      // 爬取完成处理
      socketRef.current.on('crawlComplete', () => {
        console.log('Crawl complete');
        setIsCrawling(false);
      });

      // 错误处理
      socketRef.current.on('crawlError', (error) => {
        console.error('Crawl error:', error);
        setIsCrawling(false);
        handleError(error);
      });

      // 连接错误处理
      socketRef.current.on('connect_error', (error) => {
        console.error('Connection error:', error);
        handleError(error);
      });

    } catch (error) {
      handleError(error);
    }

    // 清理函数
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [handleError]);

  // 开始爬取
  const startCrawl = useCallback(async (config: CrawlConfig) => {
    return run(
      new Promise<void>((resolve, reject) => {
        if (!socketRef.current?.connected) {
          reject(new Error('未连接到服务器'));
          return;
        }

        setIsCrawling(true);
        setProgress({
          total: 0,
          completed: 0,
          failed: 0,
          tasks: [],
          currentTask: null
        });

        socketRef.current.emit('startCrawl', config);

        // 设置超时
        const timeout = setTimeout(() => {
          reject(new Error('请求超时'));
        }, 10000);

        // 成功回调
        const onComplete = () => {
          clearTimeout(timeout);
          resolve();
        };

        // 错误回调
        const onError = (error: any) => {
          clearTimeout(timeout);
          reject(error);
        };

        socketRef.current.once('crawlComplete', onComplete);
        socketRef.current.once('crawlError', onError);
      })
    ).catch(error => {
      setIsCrawling(false);
      throw error;
    });
  }, [run]);

  // 重试失败的任务
  const retryTasks = useCallback(async (taskIds: string[]) => {
    return run(
      new Promise<void>((resolve, reject) => {
        if (!socketRef.current?.connected) {
          reject(new Error('未连接到服务器'));
          return;
        }

        socketRef.current.emit('retryTasks', taskIds);

        const timeout = setTimeout(() => {
          reject(new Error('重试请求超时'));
        }, 10000);

        const onComplete = () => {
          clearTimeout(timeout);
          resolve();
        };

        const onError = (error: any) => {
          clearTimeout(timeout);
          reject(error);
        };

        socketRef.current.once('retryComplete', onComplete);
        socketRef.current.once('retryError', onError);
      })
    );
  }, [run]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  // 重新连接
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.connect();
    }
  }, []);

  return {
    isConnected,
    isCrawling,
    progress,
    startCrawl,
    retryTasks,
    disconnect,
    reconnect
  };
}