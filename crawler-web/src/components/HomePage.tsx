// src/components/HomePage.tsx
'use client';

import { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Steps } from '@/components/ui/steps';
import { Button } from '@/components/ui/button';
import { useAsyncWithError } from '@/hooks/useAsyncWithError';
import { QueryDatePicker } from '@/components/QueryDatePicker';
import {
  DynamicCompanyInput,
  DynamicWebsiteSelector,
  DynamicCrawlProgress
} from '@/components/DynamicComponents';

const STEPS = [
  { id: 1, title: '输入公司', description: '输入或粘贴待查询公司' },
  { id: 2, title: '选择网站', description: '选择需要查询的网站' },
  { id: 3, title: '查询进度', description: '查看查询进度和结果' },
];

export function HomePage() {
  const {
    companies,
    selectedWebsites,
    crawlProgress,
    currentStep,
    isConnected,
    isCrawling,
    queryDate,
    setQueryDate,
    setCompanies,
    setSelectedWebsites,
    setCurrentStep,
    startCrawling,
    retryCrawling,
    downloadResults,
  } = useApp();

  const { handleError } = useAsyncWithError();

  const handleNext = async () => {
    try {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题区域 */}
      <div className="text-center pb-4 border-b dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          企业信息查询系统
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          自动化企业信息查询和截图工具
        </p>
      </div>

      {/* 步骤指示器 */}
      <div className="py-4">
        <Steps 
          steps={STEPS}
          currentStep={currentStep}
        />
      </div>

      {/* 主要内容区域 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {currentStep === 3 && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-sm mx-auto">
              <QueryDatePicker
                date={queryDate}
                onChange={(date) => date && setQueryDate(date)}
                disabled={isCrawling}
              />
            </div>
          </div>
        )}
        
        <div className="p-6 min-h-[400px]">
          {currentStep === 1 && (
            <div className="space-y-4">
              <DynamicCompanyInput
                companies={companies}
                onChange={setCompanies}
                disabled={isCrawling}
              />
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <DynamicWebsiteSelector
                selectedWebsites={selectedWebsites}
                onChange={setSelectedWebsites}
                disabled={isCrawling}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <DynamicCrawlProgress
                progress={crawlProgress}
                onRetry={retryCrawling}
                onDownload={downloadResults}
                isConnected={isConnected}
                isCrawling={isCrawling}
              />
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮区域 */}
      <div className="flex justify-between pt-4">
        <Button
          onClick={handlePrev}
          variant="outline"
          disabled={currentStep === 1 || isCrawling}
        >
          上一步
        </Button>

        {currentStep < 3 ? (
          <Button
            onClick={handleNext}
            disabled={
              (currentStep === 1 && companies.length === 0) ||
              (currentStep === 2 && selectedWebsites.length === 0) ||
              isCrawling
            }
          >
            下一步
          </Button>
        ) : (
          <Button
            onClick={startCrawling}
            disabled={!isConnected || isCrawling || crawlProgress.total > 0}
            className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
          >
            开始查询
          </Button>
        )}
      </div>
    </div>
  );
}