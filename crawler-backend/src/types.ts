// src/types.ts
export interface Website {
  name: string;
  homeUrl: string;
  searchInputSelector: string;
  searchButtonSelector: string;
  resultsSelector: string;
  needsNavigation?: boolean;
  needsCaptcha?: boolean;
}

export interface CrawlTask {
  id: string;
  company: string;
  website: Website;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'retrying';
  retries: number;
  error?: string;
  screenshot?: string;
}

export interface CrawlProgress {
  total: number;
  completed: number;
  failed: number;
  tasks: CrawlTask[];
  currentTask: CrawlTask | null;
}

export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

export interface BrowserOptions {
  headless: boolean;
  defaultViewport: {
    width: number;
    height: number;
  };
  userAgent?: string;
}

export interface ScreenshotOptions {
  fullPage?: boolean;
  timestamp?: boolean;
  watermark?: boolean;
}

// 新增的 CrawlConfig 接口
export interface CrawlConfig {
  companies: string[];
  websites: Website[];
  queryDate?: Date;
}