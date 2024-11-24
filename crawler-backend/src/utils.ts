// src/utils.ts
import { RetryOptions } from './types';

export async function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[\/\\:*?"<>|]/g, '_');
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;
  let delay = options.initialDelay;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === options.maxAttempts || 
          (options.shouldRetry && !options.shouldRetry(error))) {
        throw lastError;
      }

      if (options.onRetry) {
        options.onRetry(lastError, attempt);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * options.backoffFactor, options.maxDelay);
    }
  }

  throw lastError!;
}

export class Logger {
  private static instance: Logger;
  private debugEnabled: boolean;

  private constructor() {
    this.debugEnabled = process.env.DEBUG === 'true';
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  info(message: string, ...args: any[]): void {
    console.log(`[INFO] ${message}`, ...args);
  }

  error(message: string | Error, ...args: any[]): void {
    const errorMessage = message instanceof Error ? message.message : message;
    console.error(`[ERROR] ${errorMessage}`, ...args);
    if (message instanceof Error && message.stack) {
      console.error(message.stack);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.debugEnabled) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }
}

export function getEnvironmentVariable(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
}

export function parseBoolean(value: string | undefined, defaultValue: boolean = false): boolean {
  if (value === undefined) return defaultValue;
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

export function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// 格式化日期时间字符串
export function formatDateTime(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

// 检测页面是否完全加载
export async function waitForNetworkIdle(page: any, timeout = 30000, maxInflightRequests = 0): Promise<void> {
  try {
    await page.waitForNetworkIdle({ 
      timeout, 
      idleTime: 500, 
      maxInflightRequests 
    });
  } catch (error) {
    console.warn('Network idle timeout:', error);
  }
}