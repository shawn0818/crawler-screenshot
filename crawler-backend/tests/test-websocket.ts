// tests/test-websocket.ts
import { io } from 'socket.io-client';
import type { Website } from '../src/types';

// 测试配置
const testWebsites: Website[] = [
  {
    name: "百度",
    homeUrl: "https://www.baidu.com",
    searchInputSelector: "#kw",
    searchButtonSelector: "#su",
    resultsSelector: "#content_left",
    needsNavigation: false
  }
];

const testCompanies = [
  "腾讯科技",
  "阿里巴巴",
  "华为技术有限公司",
  "字节跳动"
];

async function runTest() {
  console.log('=== 开始爬虫测试 ===');
  console.log('测试配置:', {
    companies: testCompanies,
    websites: testWebsites.map(w => w.name)
  });

  const socket = io('http://localhost:3001');
  let startTime: number;

  // 连接成功事件
  socket.on('connect', () => {
    console.log('\n✓ 成功连接到服务器');
    console.log('\n开始执行爬取任务...');
    startTime = Date.now();

    // 发送爬取请求
    socket.emit('startCrawl', {
      companies: testCompanies,
      websites: testWebsites
    });
  });

  // 进度更新事件
  socket.on('crawlProgress', (progress) => {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n进度更新 [' + elapsedTime + 's]');
    console.log('----------------------------------------');
    console.log('总任务数:', progress.total);
    console.log('已完成:', progress.completed);
    console.log('失败:', progress.failed);
    
    if (progress.currentTask) {
      console.log('\n当前任务:');
      console.log('- 公司:', progress.currentTask.company);
      console.log('- 网站:', progress.currentTask.website.name);
      console.log('- 状态:', progress.currentTask.status);
      if (progress.currentTask.error) {
        console.log('- 错误:', progress.currentTask.error);
      }
      if (progress.currentTask.screenshot) {
        console.log('- 截图:', progress.currentTask.screenshot);
      }
    }
    console.log('----------------------------------------');
  });

  // 爬取完成事件
  socket.on('crawlComplete', () => {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n✓ 所有任务已完成!');
    console.log('总耗时:', totalTime, '秒');

    setTimeout(() => {
      socket.disconnect();
      process.exit(0);
    }, 1000);
  });

  // 错误处理
  socket.on('crawlError', (error) => {
    console.error('\n× 爬取错误:', error);
    socket.disconnect();
    process.exit(1);
  });

  // 连接错误处理
  socket.on('connect_error', (error) => {
    console.error('\n× 连接错误:', error);
    process.exit(1);
  });

  // 断开连接事件
  socket.on('disconnect', () => {
    console.log('\n已断开与服务器的连接');
  });
}

// 运行测试
console.log('\n正在启动测试客户端...');
runTest().catch(console.error);