import './globals.css';
import type { Metadata } from 'next';
import { ToastProvider, Toast } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: '企业信息查询系统',
  description: '自动化企业信息查询和截图工具',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>
        <ToastProvider>
          {children}
          <Toast />
        </ToastProvider>
      </body>
    </html>
  );
}