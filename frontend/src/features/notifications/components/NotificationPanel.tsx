'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Bell, ChevronRight } from 'lucide-react';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { Badge } from '@/components/ui/badge';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import {
  useMarkNotifications,
  useNotificationList,
  useUnreadCount,
} from '../hooks/useNotifications';
import { MarkAllReadButton } from './MarkAllReadButton';
import { NotificationRow } from './NotificationRow';

interface NotificationPanelProps {
  title: ReactNode;
  /** How many of the newest notifications to show. */
  limit: number;
  /** Fetch the list only when the panel is visible (the bell loads it on open). */
  enabled?: boolean;
  /** Cap the list height and scroll inside the panel (popover) instead of growing with its rows. */
  scroll?: boolean;
  /** Called when the user follows a link out of the panel. */
  onNavigate?: () => void;
}

/**
 * Newest notifications with the unread total, "mark all read" and a link to the full list.
 * The body of the header bell popover and of the dashboard card.
 */
export function NotificationPanel({
  title,
  limit,
  enabled = true,
  scroll = false,
  onNavigate,
}: NotificationPanelProps) {
  const t = useT();
  const f = useFormat();
  const unread = useUnreadCount();

  return (
    <>
      <div className="flex min-h-12 items-center justify-between gap-2 border-b px-4 py-2">
        <p className="flex items-center gap-2 font-medium">
          <Bell className="size-4 text-muted-foreground" aria-hidden />
          {title}
          {unread > 0 && <Badge variant="danger">{f.number(unread)}</Badge>}
        </p>
        <MarkAllReadButton />
      </div>
      <div className={cn(scroll && 'max-h-96 overflow-y-auto overscroll-contain')}>
        <NotificationFeed limit={limit} enabled={enabled} onNavigate={onNavigate} />
      </div>
      <Link
        href="/notifications"
        onClick={onNavigate}
        className="flex min-h-11 items-center justify-center gap-1 border-t text-sm font-medium text-primary hover:bg-muted/50"
      >
        {t('notifications.viewAll')}
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
      </Link>
    </>
  );
}

function NotificationFeed({
  limit,
  enabled,
  onNavigate,
}: Pick<NotificationPanelProps, 'limit' | 'enabled' | 'onNavigate'>) {
  const t = useT();
  const list = useNotificationList(1, enabled);
  const { markRead } = useMarkNotifications();

  if (list.isPending) {
    return (
      <div className="space-y-2 p-4" role="status" aria-label={t('common.loading')}>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (list.isError) {
    return <ErrorState className="m-3 py-6" error={list.error} onRetry={() => list.refetch()} />;
  }
  const items = list.data.items.slice(0, limit);
  if (items.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        {t('notifications.empty')}
      </p>
    );
  }
  return (
    <ul className="divide-y">
      {items.map((n) => (
        <li key={n.id}>
          <NotificationRow notification={n} onRead={markRead.mutate} onNavigate={onNavigate} />
        </li>
      ))}
    </ul>
  );
}
