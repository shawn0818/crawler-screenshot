// src/lib/crawlerEngine.ts
import JSZip from 'jszip';
import { retryOperation } from '@/lib/utils';
import type { Website, CrawlTask, CrawlProgress } from '@/types';

export class CrawlerEngine {
  private tasks: Map<string, CrawlTask> = new Map();
  private onProgressUpdate?: (progress: CrawlProgress) => void;
  private MAX_RETRIES = 5;
  private readonly DELAY_BETWEEN_REQUESTS = 1000; // 请求间隔
  
  constructor(onProgressUpdate?: (progress: CrawlProgress) => void) {
    this.onProgressUpdate = onProgressUpdate;
  }

  private generateTaskId(company: string, website: Website): string {
    return `${company}-${website.name}`;
  }

  private updateProgress() {
    if (!this.onProgressUpdate) return;

    const tasks = Array.from(this.tasks.values());
    const progress: CrawlProgress = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'success').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      tasks: tasks,
      currentTask: tasks.find(t => t.status === 'processing')
    };

    this.onProgressUpdate(progress);
  }

  private async takeScreenshot(iframeDoc: Document): Promise<string> {
    // 使用 html2canvas 截图
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(iframeDoc.body, {
      scale: 1,
      useCORS: true,
      logging: false,
      allowTaint: false,
    });
    return canvas.toDataURL('image/png');
  }

  async crawlSite(company: string, website: Website): Promise<void> {
    const taskId = this.generateTaskId(company, website);
    const task: CrawlTask = {
      id: taskId,
      company,
      website,
      status: 'processing',
      retries: 0,
      error: undefined,
      screenshot: undefined,
    };

    this.tasks.set(taskId, task);
    this.updateProgress();

    try {
      await retryOperation(
        async () => {
          // 创建一个隐藏的 iframe 用于加载网站
          const iframe = document.createElement('iframe');
          iframe.style.width = '1366px';
          iframe.style.height = '768px';
          iframe.style.position = 'fixed';
          iframe.style.left = '-10000px';
          document.body.appendChild(iframe);

          try {
            // 加载网站
            await new Promise<void>((resolve, reject) => {
              iframe.onload = () => resolve();
              iframe.onerror = () => reject(new Error('Failed to load website'));
              iframe.src = website.homeUrl;
            });

            // 等待页面加载
            await new Promise(resolve => setTimeout(resolve, 3000));

            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) throw new Error('Cannot access iframe content');

            // 查找并填充搜索框
            const searchInput = iframeDoc.querySelector(website.searchInputSelector) as HTMLInputElement;
            if (!searchInput) throw new Error('Search input not found');

            searchInput.value = company;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));

            // 等待输入完成
            await new Promise(resolve => setTimeout(resolve, 500));

            // 点击搜索按钮
            const searchButton = iframeDoc.querySelector(website.searchButtonSelector) as HTMLElement;
            if (!searchButton) throw new Error('Search button not found');

            searchButton.click();

            // 等待结果加载
            await new Promise(resolve => setTimeout(resolve, 
              website.needsNavigation ? 5000 : 3000
            ));

            // 等待结果选择器出现
            const resultsElement = iframeDoc.querySelector(website.resultsSelector);
            if (!resultsElement && !website.needsNavigation) {
              throw new Error('Results not found');
            }

            // 截图
            const screenshot = await this.takeScreenshot(iframeDoc);

            // 更新任务状态
            task.status = 'success';
            task.screenshot = screenshot;
            this.tasks.set(taskId, task);

            // 清理
            iframe.remove();

            // 添加延迟，避免请求过快
            await new Promise(resolve => setTimeout(resolve, this.DELAY_BETWEEN_REQUESTS));
          } finally {
            // 确保 iframe 被移除
            iframe.remove();
          }
        },
        {
          maxAttempts: this.MAX_RETRIES,
          initialDelay: 2000,
          maxDelay: 10000,
          backoffFactor: 2,
          shouldRetry: (error: unknown) => {
            // 某些错误不需要重试
            if (error instanceof Error) {
              const nonRetryableErrors = [
                'Search input not found',
                'Search button not found',
              ];
              return !nonRetryableErrors.some(msg => error.message.includes(msg));
            }
            return true;
          },
          onRetry: (error: Error, attempt: number) => {
            task.retries = attempt;
            task.error = error.message;
            task.status = 'retrying';
            this.tasks.set(taskId, task);
            this.updateProgress();
          },
        }
      );
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : '未知错误';
      this.tasks.set(taskId, task);
      console.error(`Crawl failed for ${taskId}:`, error);
    }

    this.updateProgress();
  }

  async startCrawling(companies: string[], websites: Website[]): Promise<void> {
    this.tasks.clear();
    // 并发控制
    const concurrency = 2; // 同时执行的任务数
    const queue = [];

    for (const company of companies) {
      for (const website of websites) {
        queue.push({ company, website });
      }
    }

    // 使用 Promise.all 和 chunk 处理并发
    while (queue.length > 0) {
      const chunk = queue.splice(0, concurrency);
      await Promise.all(
        chunk.map(({ company, website }) => this.crawlSite(company, website))
      );
    }
  }

  async retry(taskIds: string[]): Promise<void> {
    for (const taskId of taskIds) {
      const task = this.tasks.get(taskId);
      if (task && task.status === 'failed') {
        task.retries = 0;
        task.error = undefined;
        task.status = 'pending';
        this.tasks.set(taskId, task);
        this.updateProgress();

        await this.crawlSite(task.company, task.website);
      }
    }
  }

  async downloadResults(): Promise<Blob> {
    const zip = new JSZip();

    // 按公司分组创建文件夹
    const groupedTasks = Array.from(this.tasks.values()).reduce((acc, task) => {
      if (task.status === 'success' && task.screenshot) {
        if (!acc[task.company]) {
          acc[task.company] = [];
        }
        acc[task.company].push({
          website: task.website,
          screenshot: task.screenshot,
        });
      }
      return acc;
    }, {} as Record<string, Array<{ website: Website; screenshot: string }>>);

    // 添加到 zip
    for (const [company, results] of Object.entries(groupedTasks)) {
      const folder = zip.folder(company);
      if (!folder) continue;

      for (const { website, screenshot } of results) {
        const fileName = `${website.name.replace(/[^a-z0-9]/gi, '_')}.png`;
        const data = screenshot.replace(/^data:image\/\w+;base64,/, '');
        folder.file(fileName, data, { base64: true });
      }

      // 添加元数据
      const metadata = {
        timestamp: new Date().toISOString(),
        company,
        results: results.map(r => ({
          website: r.website.name,
          url: r.website.homeUrl,
        })),
      };
      folder.file('metadata.json', JSON.stringify(metadata, null, 2));
    }

    return await zip.generateAsync({ type: 'blob' });
  }

  getProgress(): CrawlProgress {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'success').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      tasks: tasks,
      currentTask: tasks.find(t => t.status === 'processing'),
    };
  }
}