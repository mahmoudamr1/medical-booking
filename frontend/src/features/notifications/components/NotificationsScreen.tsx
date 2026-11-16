'use client';

import { useState, type ReactNode } from 'react';
import { Bell } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pagination } from '@/components/shared/Pagination';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { useMarkNotifications, useNotificationList } from '../hooks/useNotifications';
import { MarkAllReadButton } from './MarkAllReadButton';
import { NotificationContent } from './NotificationRow';

/**
 * Every notification of the signed-in user, paginated, with "mark as read" per item and for all.
 * `children` render between the header and the list (the route passes pending clinic invitations).
 */
export function NotificationsScreen({ children }: { children?: ReactNode }) {
  const t = useT();
  const [page, setPage] = useState(1);
  const list = useNotificationList(page);
  const { markRead } = useMarkNotifications();

  return (
    <div className="container-page max-w-3xl space-y-6 py-6 sm:py-10">
      <PageHeader
        title={t('notifications.title')}
        actions={<MarkAllReadButton variant="outline" />}
      />
      {children}
      {list.isPending ? (
        <LoadingState rows={4} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState icon={Bell} title={t('notifications.empty')} />
      ) : (
        <>
          <ul className={cn('space-y-3', list.isPlaceholderData && 'opacity-60')}>
            {list.data.items.map((n) => (
              <li
                key={n.id}
                className={cn(
                  'flex items-start justify-between gap-4 rounded-xl border bg-card p-4',
                  !n.read_at && 'border-s-4 border-primary',
                )}
              >
                <NotificationContent notification={n} />
                {!n.read_at && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markRead.mutate(n.id)}
                    disabled={markRead.isPending}
                  >
                    {t('notifications.markRead')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <Pagination meta={list.data.pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
