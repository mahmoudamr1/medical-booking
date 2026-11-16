'use client';

import { ReportsTab } from './ReportsTab';
import { ReviewsTab } from './ReviewsTab';
import { Flag, MessageSquare } from 'lucide-react';
import { useUrlFilters } from '../filters';
import type { ReportStatus, ReviewStatus } from '../../types';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '@/i18n/provider';

export const REVIEW_STATUSES: ReviewStatus[] = ['published', 'hidden'];
export const REPORT_STATUSES: ReportStatus[] = ['open', 'resolved', 'dismissed'];

export function ReviewsScreen() {
  const t = useT();
  const { values, set } = useUrlFilters(['tab'] as const);
  const tab = values.tab === 'reports' ? 'reports' : 'reviews';

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.reviews.title')} description={t('admin.reviews.subtitle')} />
      <Tabs value={tab} onValueChange={(v) => set({ tab: v === 'reviews' ? null : v })}>
        <TabsList>
          <TabsTrigger value="reviews" className="px-4">
            <MessageSquare aria-hidden />
            {t('admin.reviews.tabs.reviews')}
          </TabsTrigger>
          <TabsTrigger value="reports" className="px-4">
            <Flag aria-hidden />
            {t('admin.reviews.tabs.reports')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === 'reviews' ? <ReviewsTab /> : <ReportsTab />}
    </div>
  );
}
