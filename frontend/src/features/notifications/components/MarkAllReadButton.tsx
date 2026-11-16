'use client';

import type { ComponentProps } from 'react';
import { CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { useMarkNotifications, useUnreadCount } from '../hooks/useNotifications';

/** "Mark all as read"; renders nothing while there is nothing unread. */
export function MarkAllReadButton({
  variant = 'ghost',
}: Pick<ComponentProps<typeof Button>, 'variant'>) {
  const t = useT();
  const unread = useUnreadCount();
  const { markAll } = useMarkNotifications();
  if (unread === 0) return null;

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={() => markAll.mutate()}
      disabled={markAll.isPending}
    >
      <CheckCheck aria-hidden />
      {t('notifications.markAllRead')}
    </Button>
  );
}
