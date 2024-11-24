// src/hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  // 获取初始值
  const readValue = () => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // 返回包装后的更新方法
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const newValue = value instanceof Function ? value(storedValue) : value;
      window.localStorage.setItem(key, JSON.stringify(newValue));
      setStoredValue(newValue);
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

// src/hooks/useAsync.ts
import { useState, useCallback } from 'react';

interface AsyncState<T> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: T | null;
  error: Error | null;
}

export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: null,
    error: null,
  });

  const run = useCallback(async (promise: Promise<T>) => {
    setState({ status: 'loading', data: null, error: null });
    try {
      const data = await promise;
      setState({ status: 'success', data, error: null });
      return data;
    } catch (error) {
      setState({ status: 'error', data: null, error: error as Error });
      throw error;
    }
  }, []);

  return { ...state, run };
}

// src/hooks/useQueue.ts
import { useState, useCallback } from 'react';

interface QueueItem<T> {
  id: string;
  data: T;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: Error;
}

export function useQueue<T>() {
  const [queue, setQueue] = useState<QueueItem<T>[]>([]);

  const add = useCallback((items: T | T[]) => {
    const newItems = (Array.isArray(items) ? items : [items]).map(data => ({
      id: Math.random().toString(36).slice(2),
      data,
      status: 'pending' as const,
    }));
    
    setQueue(prev => [...prev, ...newItems]);
  }, []);

  const update = useCallback((id: string, updates: Partial<QueueItem<T>>) => {
    setQueue(prev =>
      prev.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  }, []);

  const remove = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const clear = useCallback(() => {
    setQueue([]);
  }, []);

  return {
    queue,
    add,
    update,
    remove,
    clear,
  };
}

// src/hooks/useErrorBoundary.ts
import { useState, useCallback } from 'react';

export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((error: Error) => {
    setError(error);
    // 可以在这里添加错误上报逻辑
    console.error('Error caught by boundary:', error);
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    resetError,
  };
}

// src/hooks/usePrevious.ts
import { useRef, useEffect } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

// src/hooks/useUpdateEffect.ts
import { useEffect, useRef } from 'react';

export function useUpdateEffect(effect: () => void | (() => void), deps: any[]) {
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    return effect();
  }, deps);
}