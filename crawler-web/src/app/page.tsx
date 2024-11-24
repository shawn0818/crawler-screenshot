'use client';

import { PageLayout } from '@/components/PageLayout';
import { HomePage } from '@/components/HomePage';
import { AppProvider } from '@/context/AppContext';

export default function Page() {
  return (
    <AppProvider>
      <PageLayout>
        <HomePage />
      </PageLayout>
    </AppProvider>
  );
}