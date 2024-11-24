// src/crawler.ts
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs/promises';
import type { Browser, Page } from 'puppeteer';
import { 
  randomDelay, 
  retryOperation, 
  sanitizeFileName, 
  Logger,
  getEnvironmentVariable,
  parseBoolean,
  parseNumber,
  formatDateTime,
  waitForNetworkIdle
} from './utils';
import type { 
  Website, 
  CrawlTask, 
  CrawlProgress,
  BrowserOptions,
  ScreenshotOptions,
  CrawlConfig 
} from './types';

// 添加 Stealth 插件以避免被检测
puppeteer.use(StealthPlugin());

const logger = Logger.getInstance();

export class CrawlerService {
  private browser: Browser | null = null;
  private tasks = new Map<string, CrawlTask>();
  private onProgressUpdate: (progress: CrawlProgress) => void;
  private screenshotsDir: string;
  private browserOptions: BrowserOptions;
  private currentTaskDir: string;  // 新增：当前任务目录

  constructor(
    onProgressUpdate: (progress: CrawlProgress) => void,
    screenshotsDir: string = getEnvironmentVariable('SCREENSHOTS_DIR', 'screenshots')
  ) {
    this.onProgressUpdate = onProgressUpdate;
    this.screenshotsDir = path.resolve(process.cwd(), screenshotsDir || 'screenshots');

    this.currentTaskDir = '';
    
    this.browserOptions = {
      headless: parseBoolean(process.env.HEADLESS, false),
      defaultViewport: {
        width: parseNumber(process.env.DEFAULT_VIEWPORT_WIDTH, 1366),
        height: parseNumber(process.env.DEFAULT_VIEWPORT_HEIGHT, 768)
      },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
  }

  private async initialize() {
    if (!this.browser) {
      logger.debug('启动浏览器...');
      const launchOptions = {
        headless: this.browserOptions.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          `--window-size=${this.browserOptions.defaultViewport.width},${this.browserOptions.defaultViewport.height}`
        ],
        defaultViewport: this.browserOptions.defaultViewport
      };
      
      this.browser = await puppeteer.launch(launchOptions);
    }
    await fs.mkdir(this.screenshotsDir, { recursive: true });
  }

  // 创建任务目录
  private async createTaskDirectory(): Promise<string> {
    const timestamp = formatDateTime();
    const taskDir = path.join(this.screenshotsDir, `task_${timestamp}`);
    await fs.mkdir(taskDir, { recursive: true });
    logger.debug(`创建任务目录: ${taskDir}`);
    return taskDir;
  }

  // 创建公司目录
  private async createCompanyDirectory(company: string): Promise<string> {
    const companyDir = path.join(this.currentTaskDir, sanitizeFileName(company));
    await fs.mkdir(companyDir, { recursive: true });
    logger.debug(`创建公司目录: ${companyDir}`);
    return companyDir;
  }

  public async cleanup() {
    if (this.browser) {
      logger.debug('关闭浏览器...');
      await this.browser.close();
      this.browser = null;
    }
  }

  private updateProgress() {
    const tasks = Array.from(this.tasks.values());
    const progress: CrawlProgress = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'success').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      tasks: tasks,
      currentTask: tasks.find(t => t.status === 'processing') || null
    };
    this.onProgressUpdate(progress);
  }

  private async addWatermark(page: Page, websiteName: string, company: string, queryDate: Date) {
    await page.evaluate(
      ({ name, company, time }) => {
        const watermarkDiv = document.createElement('div');
        Object.assign(watermarkDiv.style, {
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          padding: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          color: '#666',
          fontSize: '12px',
          zIndex: '9999',
          borderTop: '1px solid #ddd',
          textAlign: 'left',
          fontFamily: 'Arial, sans-serif'
        });
        
        watermarkDiv.textContent = `网站：${name} | 公司：${company} | 查询时间：${time}`;
        document.body.appendChild(watermarkDiv);
        
        document.body.style.paddingBottom = '40px';
      },
      { 
        name: websiteName,
        company: company,
        time: queryDate.toLocaleString('zh-CN', { hour12: false })
      }
    );
  }

  private async typeCompanyName(page: Page, selector: string, company: string) {
    logger.debug(`等待输入框出现: ${selector}`);
    await page.waitForSelector(selector, { visible: true, timeout: 30000 });

    let inputValue = '';
    
    while (inputValue !== company) {
      // 清空输入框直到输入框没有内容
      do {
        await page.click(selector, { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await randomDelay(200, 500);
        inputValue = await page.$eval(selector, el => (el as HTMLInputElement).value.trim());
      } while (inputValue !== '');

      // 逐字符输入公司名称，延迟更长一些
      await page.focus(selector);
      for (const char of company) {
        await page.keyboard.type(char);
        await randomDelay(300, 700);
      }

      // 检查输入框的值是否正确
      inputValue = await page.$eval(selector, el => (el as HTMLInputElement).value.trim());
      if (inputValue !== company) {
        logger.warn(`输入不正确，实际输入为：${inputValue}，重新尝试...`);
        await randomDelay(500, 1000);
      }
    }

    logger.info(`公司名称输入已完成: ${company}`);
  }

  private async searchAndCapture(
    company: string,
    website: Website,
    taskId: string,
    queryDate: Date
  ): Promise<string> {
    const page = await this.browser!.newPage();
    try {
      await page.setDefaultNavigationTimeout(15000);
      await page.setDefaultTimeout(15000);
      await page.setUserAgent(this.browserOptions.userAgent!);

      logger.debug(`正在访问 ${website.homeUrl}`);
      await page.goto(website.homeUrl, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      await waitForNetworkIdle(page);

      logger.debug(`正在输入公司名称: ${company}`);
      await this.typeCompanyName(page, website.searchInputSelector, company);

      logger.debug('点击搜索按钮');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
        page.click(website.searchButtonSelector)
      ]);

      try {
        await page.waitForSelector(website.resultsSelector, {
          visible: true,
          timeout: website.needsNavigation ? 10000 : 5000
        });
        logger.debug('搜索结果已加载');
      } catch (error) {
        logger.warn(`未找到结果选择器: ${website.resultsSelector}`);
      }

      await this.addWatermark(page, website.name, company, queryDate);
      await randomDelay(500, 1000);

      // 创建公司目录并保存截图
      const companyDir = await this.createCompanyDirectory(company);
      const timestamp = formatDateTime();
      const fileName = `${sanitizeFileName(website.name)}_${timestamp}.png`;
      const screenshotPath = path.join(companyDir, fileName);
      
      logger.debug('正在保存截图...');
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });

      logger.debug(`截图已保存: ${screenshotPath}`);
      return screenshotPath;
    } finally {
      await page.close();
    }
  }

  private async processTask(company: string, website: Website, queryDate: Date) {
    const taskId = `${company}-${website.name}`;
    const task: CrawlTask = {
      id: taskId,
      company,
      website,
      status: 'processing',
      retries: 0,
    };

    this.tasks.set(taskId, task);
    this.updateProgress();

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`任务执行超时: ${taskId}`));
        }, 60000); // 60秒超时
      });

      const screenshotPath = await Promise.race([
        retryOperation(
          () => this.searchAndCapture(company, website, taskId, queryDate),
          {
            maxAttempts: parseNumber(process.env.RETRY_ATTEMPTS, 3),
            initialDelay: 2000,
            maxDelay: 10000,
            backoffFactor: 2,
            onRetry: (error, attempt) => {
              task.retries = attempt;
              task.error = error.message;
              task.status = 'retrying';
              this.tasks.set(taskId, task);
              this.updateProgress();
              logger.warn(`重试任务 ${taskId} (第${attempt}次): ${error.message}`);
            }
          }
        ),
        timeoutPromise
      ]);

      task.status = 'success';
      task.screenshot = screenshotPath as string; // Type assertion to fix the lint error
      logger.info(`任务成功 ${taskId}`);

    } catch (error) {
      task.status = 'failed';
      if (error instanceof Error) {
        task.error = error.message;
      } else {
        task.error = '未知错误';
      }
      logger.error(`任务失败 ${taskId}:`, error);

      if (error instanceof Error && error.message.includes('超时')) {
        try {
          await this.cleanup();
          await this.initialize();
        } catch (cleanupError) {
          logger.error('重置浏览器失败:', cleanupError);
        }
      }
    }

    this.tasks.set(taskId, task);
    this.updateProgress();
  }

  async startCrawling(config: CrawlConfig) {
    try {
      await this.initialize();
      this.tasks.clear();

      // 创建新的任务目录
      this.currentTaskDir = await this.createTaskDirectory();
      logger.info(`开始新任务，目录: ${this.currentTaskDir}`);

      const { companies, websites, queryDate = new Date() } = config;
      const concurrency = parseNumber(process.env.MAX_CONCURRENT_TASKS, 2);
      const queue = [];

      for (const company of companies) {
        for (const website of websites) {
          queue.push({ company, website });
        }
      }

      logger.info(`开始处理任务，总数: ${queue.length}，并发数: ${concurrency}`);

      while (queue.length > 0) {
        const chunk = queue.splice(0, concurrency);
        await Promise.all(
          chunk.map(({ company, website }) => 
            this.processTask(company, website, queryDate)
          )
        );
      }

      logger.info('所有任务处理完成');
      return this.currentTaskDir;  // 返回任务目录路径
    } catch (error) {
      logger.error('爬取过程错误:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async retry(taskIds: string[]) {
    try {
      await this.initialize();
      
      for (const taskId of taskIds) {
        const task = this.tasks.get(taskId);
        if (task && task.status === 'failed') {
          logger.info(`开始重试任务: ${taskId}`);
          task.retries = 0;
          task.error = undefined;
          task.status = 'pending';
          this.tasks.set(taskId, task);
          this.updateProgress();

          await this.processTask(task.company, task.website, new Date());
        }
      }
    } finally {
      await this.cleanup();
    }
  }

  getProgress(): CrawlProgress {
    const tasks = Array.from(this.tasks.values());
    return {
      total: this.tasks.size,
      completed: tasks.filter(t => t.status === 'success').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      tasks: tasks,
      currentTask: tasks.find(t => t.status === 'processing') || null
    };
  }

  // 获取当前任务目录
  public getCurrentTaskDir(): string {
    return this.currentTaskDir;
  }
}