// tests/test-retry.ts
import { io } from 'socket.io-client';
import type { Website } from '../src/types';

// 测试用的错误场景网站配置
const testWebsites: Website[] = [
  {
    name: "正常网站-百度",
    homeUrl: "https://www.baidu.com",
    searchInputSelector: "#kw",
    searchButtonSelector: "#su",
    resultsSelector: "#content_left",
    needsNavigation: false
  },
  {
    name: "错误选择器网站",
    homeUrl: "https://www.baidu.com",
    searchInputSelector: "#wrong-input-selector",  // 错误的选择器
    searchButtonSelector: "#wrong-button",         // 错误的选择器
    resultsSelector: "#wrong-results",             // 错误的选择器
    needsNavigation: false
  },
  {
    name: "超时网站",
    homeUrl: "https://www.baidu.com",
    searchInputSelector: "#kw",
    searchButtonSelector: "#su",
    resultsSelector: "#content_left",
    needsNavigation: true  // 强制等待导航，可能触发超时
  },
  {
    name: "错误URL网站",
    homeUrl: "https://not-exist-website.com",  // 不存在的网站
    searchInputSelector: "#kw",
    searchButtonSelector: "#su",
    resultsSelector: "#content_left",
    needsNavigation: false
  }
];

const testCompanies = ["测试公司重试机制"];

async function runRetryTest() {
  console.log('\n=== 开始测试重试机制 ===');
  console.log('测试配置:', {
    companies: testCompanies,
    websites: testWebsites.map(w => w.name)
  });

  const socket = io('http://localhost:3001');
  let startTime: number;
  let retryAttempts = new Map<string, number>();

  // 连接成功事件
  socket.on('connect', () => {
    console.log('\n✓ 成功连接到服务器');
    console.log('\n开始执行重试测试...');
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
    
    // 记录和显示重试信息
    progress.tasks.forEach(task => {
      const taskKey = `${task.company}-${task.website.name}`;
      if (task.status === 'retrying') {
        retryAttempts.set(taskKey, (retryAttempts.get(taskKey) || 0) + 1);
      }

      if (task.status === 'failed' || task.status === 'retrying') {
        console.log(`\n任务状态 [${taskKey}]:`);
        console.log('- 状态:', task.status);
        console.log('- 重试次数:', task.retries);
        console.log('- 错误信息:', task.error);
      } else if (task.status === 'success') {
        console.log(`\n任务成功 [${taskKey}]:`);
        console.log('- 截图路径:', task.screenshot);
        const retries = retryAttempts.get(taskKey);
        if (retries) {
          console.log('- 成功前重试次数:', retries);
        }
      }
    });

    if (progress.currentTask) {
      console.log('\n当前正在处理的任务:');
      console.log('- 公司:', progress.currentTask.company);
      console.log('- 网站:', progress.currentTask.website.name);
      console.log('- 状态:', progress.currentTask.status);
    }
    console.log('----------------------------------------');
  });

  // 爬取完成事件
  socket.on('crawlComplete', () => {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n=== 重试测试完成 ===');
    console.log('总耗时:', totalTime, '秒');
    
    // 显示重试统计
    console.log('\n重试统计:');
    retryAttempts.forEach((retries, taskKey) => {
      console.log(`${taskKey}: 重试 ${retries} 次`);
    });

    setTimeout(() => {
      socket.disconnect();
      process.exit(0);
    }, 1000);
  });

  // 错误处理
  socket.on('crawlError', (error) => {
    console.error('\n× 测试过程发生错误:', error);
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

// 运行重试测试
console.log('\n正在启动重试机制测试...');
runRetryTest().catch(console.error);