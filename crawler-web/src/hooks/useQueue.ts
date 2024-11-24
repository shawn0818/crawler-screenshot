// src/hooks/useQueue.ts
import { useState, useCallback, useRef } from 'react';
import type { Website } from '@/types';

export interface QueueTask {
  id: string;
  company: string;
  website: Website;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  retries: number;
  timestamp: number;
}

interface UseQueueOptions {
  maxRetries?: number;
  maxConcurrent?: number;
}

export function useQueue(options: UseQueueOptions = {}) {
  const {
    maxRetries = 3,
    maxConcurrent = 2
  } = options;

  const [queue, setQueue] = useState<QueueTask[]>([]);
  const processingCount = useRef(0);

  const generateTaskId = useCallback((company: string, website: Website) => {
    return `${company}-${website.name}-${Date.now()}`;
  }, []);

  const add = useCallback((companies: string[], websites: Website[]) => {
    const newTasks = companies.flatMap(company =>
      websites.map(website => ({
        id: generateTaskId(company, website),
        company,
        website,
        status: 'pending' as const,
        retries: 0,
        timestamp: Date.now()
      }))
    );

    setQueue(prev => [...prev, ...newTasks]);
    return newTasks.map(task => task.id);
  }, [generateTaskId]);

  const update = useCallback((taskId: string, updates: Partial<QueueTask>) => {
    setQueue(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, ...updates }
        : task
    ));
  }, []);

  const retry = useCallback((taskId: string) => {
    setQueue(prev => prev.map(task => {
      if (task.id === taskId && task.status === 'failed') {
        if (task.retries >= maxRetries) {
          return {
            ...task,
            error: `超过最大重试次数 (${maxRetries})`
          };
        }
        return {
          ...task,
          status: 'pending',
          retries: task.retries + 1,
          error: undefined,
          timestamp: Date.now()
        };
      }
      return task;
    }));
  }, [maxRetries]);

  const remove = useCallback((taskId: string) => {
    setQueue(prev => prev.filter(task => task.id !== taskId));
  }, []);

  const clear = useCallback(() => {
    setQueue([]);
    processingCount.current = 0;
  }, []);

  const getNextPending = useCallback(() => {
    return queue.find(task => task.status === 'pending');
  }, [queue]);

  const canProcess = useCallback(() => {
    return processingCount.current < maxConcurrent;
  }, [maxConcurrent]);

  const getStats = useCallback(() => {
    const total = queue.length;
    const pending = queue.filter(t => t.status === 'pending').length;
    const processing = queue.filter(t => t.status === 'processing').length;
    const completed = queue.filter(t => t.status === 'completed').length;
    const failed = queue.filter(t => t.status === 'failed').length;

    return {
      total,
      pending,
      processing,
      completed,
      failed
    };
  }, [queue]);

  return {
    queue,
    add,
    update,
    retry,
    remove,
    clear,
    getNextPending,
    canProcess,
    getStats
  };
}