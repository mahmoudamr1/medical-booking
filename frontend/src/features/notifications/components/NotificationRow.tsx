'use client';

import Link from 'next/link';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { notificationHref, notificationText } from '../content';
import type { AppNotification } from '../types';

/**
 * Title, body and time of a notification. Phrasing content only, so it can sit inside a link or a
 * button; `compact` is the dense variant used in the bell and the dashboard card.
 */
export function NotificationContent({
  notification: n,
  compact = false,
}: {
  notification: AppNotification;
  compact?: boolean;
}) {
  const t = useT();
  const f = useFormat();
  const { title, body } = notificationText(n);
  const unread = !n.read_at;

  return (
    <span className="block min-w-0 flex-1">
      <span
        className={cn(
          'block text-foreground',
          compact && 'truncate text-sm',
          unread && 'font-semibold',
        )}
      >
        {unread && <span className="sr-only">{t('notifications.unread')}: </span>}
        {title}
      </span>
      {body && (
        <span
          className={cn('block text-muted-foreground', compact ? 'line-clamp-2 text-xs' : 'text-sm')}
        >
          {body}
        </span>
      )}
      {n.created_at && (
        <time dateTime={n.created_at} className="mt-1 block text-xs text-muted-foreground">
          {f.dateTime(n.created_at)}
        </time>
      )}
    </span>
  );
}

const ROW_CLASS = 'flex min-h-11 w-full gap-2 px-4 py-2.5 text-start';
const INTERACTIVE_CLASS =
  'hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset';

/**
 * Compact notification row: a link when the notification points somewhere, a button while it is
 * only unread, plain text otherwise. Activating an unread row marks it read.
 */
export function NotificationRow({
  notification: n,
  onRead,
  onNavigate,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
  /** Called when a row that links somewhere is followed (e.g. to close the popover). */
  onNavigate?: () => void;
}) {
  const href = notificationHref(n);
  const unread = !n.read_at;
  const content = (
    <>
      <span
        className={cn('mt-2 size-2 shrink-0 rounded-full', unread && 'bg-primary')}
        aria-hidden
      />
      <NotificationContent notification={n} compact />
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(ROW_CLASS, INTERACTIVE_CLASS)}
        onClick={() => {
          if (unread) onRead(n.id);
          onNavigate?.();
        }}
      >
        {content}
      </Link>
    );
  }
  if (unread) {
    return (
      <button
        type="button"
        className={cn(ROW_CLASS, INTERACTIVE_CLASS)}
        onClick={() => onRead(n.id)}
      >
        {content}
      </button>
    );
  }
  return <div className={ROW_CLASS}>{content}</div>;
}
