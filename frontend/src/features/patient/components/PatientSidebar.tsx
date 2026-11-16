'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronRight, History, Siren, UserCog } from 'lucide-react';
import {
  notificationHref,
  notificationText,
  useMarkNotifications,
  notificationsApi,
  notificationKeys,
} from '@/features/notifications';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const RECENT = 5;

/** Urgent help entry points: new request and the patient's urgent history. */
export function UrgentHelpCard() {
  const t = useT();
  return (
    <Card size="sm" className="gap-0" data-testid="urgent-card">
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <Siren className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-medium">{t('patientPanel.dashboard.urgentTitle')}</p>
            <p className="text-sm text-muted-foreground">
              {t('patientPanel.dashboard.urgentBody')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/urgent" className={buttonVariants({ size: 'sm' })}>
            {t('patientPanel.dashboard.urgentNew')}
          </Link>
          <Link
            href="/urgent/history"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <History aria-hidden />
            {t('patientPanel.dashboard.urgentHistory')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/** Latest notifications (shares the notifications cache with the header bell). */
export function RecentNotifications() {
  const t = useT();
  const f = useFormat();
  const { markRead, markAll } = useMarkNotifications();
  const list = useQuery({
    queryKey: notificationKeys.recent,
    queryFn: () => notificationsApi.list(1, RECENT),
  });
  const unread = list.data?.items.filter((n) => !n.read_at).length ?? 0;

  return (
    <Card className="gap-0 py-0" data-testid="recent-notifications">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <p className="flex items-center gap-2 font-medium">
          <Bell className="size-4 text-muted-foreground" aria-hidden />
          {t('patientPanel.dashboard.notificationsTitle')}
          {unread > 0 && <Badge variant="danger">{f.number(unread)}</Badge>}
        </p>
        {unread > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
          >
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>
      {list.isPending ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState className="m-3" error={list.error} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          {t('notifications.empty')}
        </p>
      ) : (
        <ul className="divide-y">
          {list.data.items.map((n) => {
            const { title, body } = notificationText(n);
            const href = notificationHref(n);
            const content = (
              <>
                <span
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    n.read_at ? 'bg-transparent' : 'bg-primary',
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-sm', !n.read_at && 'font-medium')}>
                    {title}
                  </span>
                  {body && (
                    <span className="line-clamp-2 block text-xs text-muted-foreground">{body}</span>
                  )}
                  {n.created_at && (
                    <span className="block text-xs text-muted-foreground">
                      {f.dateTime(n.created_at)}
                    </span>
                  )}
                </span>
              </>
            );
            const cls = 'flex min-h-11 w-full gap-2 px-4 py-2.5 text-start hover:bg-muted/50';
            return (
              <li key={n.id}>
                {href ? (
                  <Link
                    href={href}
                    className={cls}
                    onClick={() => !n.read_at && markRead.mutate(n.id)}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={cls}
                    onClick={() => !n.read_at && markRead.mutate(n.id)}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Link
        href="/notifications"
        className="flex min-h-11 items-center justify-center gap-1 border-t text-sm font-medium text-primary hover:bg-muted/50"
      >
        {t('notifications.viewAll')}
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
      </Link>
    </Card>
  );
}

/** Shortcut to profile, consents and privacy. */
export function ProfileShortcut() {
  const t = useT();
  return (
    <Link
      href="/dashboard/patient/profile"
      className="flex min-h-12 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm hover:bg-muted/50"
    >
      <UserCog className="size-5 text-muted-foreground" aria-hidden />
      <span className="flex-1 font-medium">{t('patientPanel.dashboard.profileLink')}</span>
      <ChevronRight className="size-4 text-muted-foreground rtl:rotate-180" aria-hidden />
    </Link>
  );
}
