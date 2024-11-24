import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui/spinner';

export const DynamicWebsiteSelector = dynamic(
  () => import('./WebsiteSelector'),
  {
    loading: () => <div className="flex justify-center p-8"><Spinner /></div>,
    ssr: false,
  }
);

export const DynamicCompanyInput = dynamic(
  () => import('./CompanyInput'),
  {
    loading: () => <div className="flex justify-center p-8"><Spinner /></div>,
  }
);

export const DynamicCrawlProgress = dynamic(
  () => import('./CrawlProgress'),
  {
    loading: () => <div className="flex justify-center p-8"><Spinner /></div>,
  }
);

export function usePreloadComponents() {
  const preloadWebsiteSelector = () => {
    const moduleId = () => import('./WebsiteSelector');
    moduleId();
  };

  const preloadCompanyInput = () => {
    const moduleId = () => import('./CompanyInput');
    moduleId();
  };

  const preloadCrawlProgress = () => {
    const moduleId = () => import('./CrawlProgress');
    moduleId();
  };

  return {
    preloadWebsiteSelector,
    preloadCompanyInput,
    preloadCrawlProgress,
  };
}