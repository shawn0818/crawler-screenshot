// src/types/index.ts

export interface Website {
  category: string;  // 改为必需字段
  name: string;
  homeUrl: string;
  searchInputSelector: string;
  searchButtonSelector: string;
  resultsSelector: string;
  needsNavigation: boolean;  // 改为必需字段
  needsCaptcha: boolean;  // 改为必需字段
}

export interface CrawlTask {
  id: string;
  company: string;
  website: Website;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
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

export interface CategoryState {
  [category: string]: {
    expanded: boolean;
    selected: boolean;
    websites: Website[];
  };
}

export interface WebsitesByCategory {
  [category: string]: Website[];
}

export interface CrawlConfig {
  companies: string[];
  websites: Website[];
  queryDate?: Date;
}

// 浏览器选项接口
export interface BrowserOptions {
  headless: boolean;
  defaultViewport: {
    width: number;
    height: number;
  };
  userAgent?: string;
}

// 重试选项接口
export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

// 截图选项接口
export interface ScreenshotOptions {
  fullPage?: boolean;
  timestamp?: boolean;
  watermark?: boolean;
}