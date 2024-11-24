// src/hooks/useAsyncWithError.ts
import { useState, useCallback } from 'react';
import { useToast } from './use-toast';

interface AsyncState<T> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: T | null;
  error: Error | null;
}

export function useAsyncWithError<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: null,
    error: null,
  });
  
  const { toast } = useToast();

  const handleError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : '未知错误';
    const errorObj = error instanceof Error ? error : new Error(message);
    
    setState(prev => ({ ...prev, status: 'error', error: errorObj }));
    
    toast({
      variant: "destructive",
      title: "错误",
      description: message,
    });

    console.error('Error:', error);
  }, [toast]);

  const run = useCallback(async (promise: Promise<T>) => {
    setState({ status: 'loading', data: null, error: null });
    try {
      const data = await promise;
      setState({ status: 'success', data, error: null });
      return data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  }, [handleError]);

  const reset = useCallback(() => {
    setState({ status: 'idle', data: null, error: null });
  }, []);

  return { 
    ...state, 
    run, 
    reset,
    handleError 
  };
}