// src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import archiver from 'archiver';
import { CrawlerService } from './crawler';
import type { Website } from './types';
import { Logger } from './utils';

const app = express();
const httpServer = createServer(app);
const logger = Logger.getInstance();

// 详细的 CORS 配置
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 204,
  allowedHeaders: ['Content-Type', 'Accept'],
  exposedHeaders: ['Content-Disposition']  // 允许前端访问这个头
};

// WebSocket 服务器设置
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Express 中间件
app.use(cors(corsOptions));
app.use(express.json());

// 静态文件服务
app.use('/screenshots', express.static('screenshots'));

// 健康检查路由
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    time: new Date().toISOString(),
    env: {
      port: process.env.PORT,
      frontend: process.env.FRONTEND_URL,
      debug: process.env.DEBUG
    }
  });
});

// 下载路由
app.get('/api/download-results', async (req, res) => {
  console.log('收到下载请求:', {
    headers: req.headers,
    url: req.url,
    query: req.query
  });
  
  try {
    // 获取任务目录
    const taskDir = req.query.taskDir as string;
    if (!taskDir) {
      logger.error('下载请求缺少任务目录参数');
      return res.status(400).json({ error: '未指定任务目录' });
    }

    const fullTaskDir = path.resolve(process.cwd(), taskDir);
    logger.debug(`任务目录路径: ${fullTaskDir}`);
    
    // 检查目录是否存在
    try {
      await fs.access(fullTaskDir);
      logger.debug('任务目录存在，继续处理');
      
      // 检查目录内是否有文件
      const files = await fs.readdir(fullTaskDir, { recursive: true });
      if (files.length === 0) {
        logger.warn('任务目录为空');
        return res.status(404).json({ error: '任务目录中没有文件' });
      }
      logger.debug(`发现 ${files.length} 个文件`);
      
    } catch (error) {
      logger.error('任务目录访问失败:', error);
      return res.status(404).json({ error: '没有找到任务目录或目录不可访问' });
    }

    // 创建临时目录
    const tempDir = path.resolve(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    logger.debug(`临时目录已创建: ${tempDir}`);

    // 创建压缩文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipFileName = `screenshots-${timestamp}.zip`;
    const zipFilePath = path.join(tempDir, zipFileName);
    logger.debug(`创建压缩文件: ${zipFileName}`);

    // 设置压缩
    const output = createWriteStream(zipFilePath);
    const archive = archiver('zip', { 
      zlib: { level: 9 } // 最高压缩级别
    });

    // 创建完成Promise
    const archiveFinished = new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      output.on('error', reject);
    });

    // 监听进度
    archive.on('progress', (progress) => {
      logger.debug('压缩进度:', progress);
    });

    archive.pipe(output);

    // 将整个任务目录添加到压缩文件
    archive.directory(fullTaskDir, false);
    logger.debug('开始压缩文件...');
    
    // 等待压缩完成
    await archive.finalize();
    await archiveFinished;
    logger.debug('压缩完成');

    // 获取压缩文件大小
    const stats = await fs.stat(zipFilePath);
    logger.debug(`压缩文件大小: ${stats.size} bytes`);

    // 设置响应头
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    res.setHeader('Cache-Control', 'no-cache');

    logger.debug('开始发送文件...');

    // 创建读取流并发送
    const fileStream = createReadStream(zipFilePath);

    // 处理文件流错误
    fileStream.on('error', (error) => {
      logger.error('文件流错误:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: '文件读取错误' });
      }
    });

    // 文件发送完成后清理
    fileStream.on('end', async () => {
      logger.debug('文件发送完成');
      // 延迟删除临时文件
      setTimeout(async () => {
        try {
          await fs.unlink(zipFilePath);
          logger.debug('临时文件已删除:', zipFilePath);
        } catch (error) {
          logger.error('删除临时文件失败:', error);
        }
      }, 1000);
    });

    // 发送文件
    fileStream.pipe(res);

  } catch (error) {
    logger.error('下载处理错误:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: '下载出错',
        details: error instanceof Error ? error.message : '未知错误'
      });
    }
  }
});

// WebSocket 连接处理
io.on('connection', (socket) => {
  let crawlerInstance: CrawlerService | null = null;

  logger.info('新的客户端连接:', {
    id: socket.id,
    address: socket.handshake.address,
    origin: socket.handshake.headers.origin
  });

  // 处理爬取请求
  socket.on('startCrawl', async (data: { companies: string[], websites: Website[], queryDate?: Date }) => {
    try {
      logger.info('收到爬取请求:', {
        companies: data.companies,
        websiteCount: data.websites.length,
        queryDate: data.queryDate
      });

      // 验证输入数据
      if (!Array.isArray(data.companies) || !Array.isArray(data.websites)) {
        throw new Error('无效的请求数据格式');
      }

      if (data.companies.length === 0 || data.websites.length === 0) {
        throw new Error('公司列表和网站列表不能为空');
      }

      // 创建爬虫实例
      crawlerInstance = new CrawlerService((progress) => {
        logger.debug('发送进度更新:', progress);
        socket.emit('crawlProgress', {
          ...progress,
          taskDir: crawlerInstance?.getCurrentTaskDir() // 添加任务目录信息
        });
      });

      // 开始爬取
      const taskDir = await crawlerInstance.startCrawling({
        companies: data.companies,
        websites: data.websites,
        queryDate: data.queryDate
      });
      
      logger.info('爬取任务完成');
      socket.emit('crawlComplete', { taskDir }); // 发送任务目录路径
    } catch (error) {
      logger.error('爬取过程错误:', error);
      socket.emit('crawlError', {
        message: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      if (crawlerInstance) {
        await crawlerInstance.cleanup();
        crawlerInstance = null;
      }
    }
  });

  // 重试失败的任务
  socket.on('retryTasks', async (taskIds: string[]) => {
    try {
      logger.info('收到重试请求:', { taskIds });

      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        throw new Error('无效的任务ID列表');
      }

      // 创建新的爬虫实例
      crawlerInstance = new CrawlerService((progress) => {
        socket.emit('crawlProgress', progress);
      });

      await crawlerInstance.retry(taskIds);
      socket.emit('retryComplete');
    } catch (error) {
      logger.error('重试任务失败:', error);
      socket.emit('retryError', {
        message: error instanceof Error ? error.message : '重试过程中发生未知错误'
      });
    } finally {
      if (crawlerInstance) {
        await crawlerInstance.cleanup();
        crawlerInstance = null;
      }
    }
  });

  // 断开连接处理
  socket.on('disconnect', async (reason) => {
    logger.info('客户端断开连接:', {
      id: socket.id,
      reason
    });

    // 清理资源
    if (crawlerInstance) {
      await crawlerInstance.cleanup();
      crawlerInstance = null;
    }
  });

  // 错误处理
  socket.on('error', (error) => {
    logger.error('Socket错误:', error);
  });
});

// 启动服务器
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info(`服务器已启动:`);
  logger.info(`- 端口: ${PORT}`);
  logger.info(`- 前端URL: ${process.env.FRONTEND_URL}`);
  logger.info(`- 调试模式: ${process.env.DEBUG === 'true' ? '开启' : '关闭'}`);
  logger.info(`- 截图目录: ${process.env.SCREENSHOTS_DIR || './screenshots'}`);
});