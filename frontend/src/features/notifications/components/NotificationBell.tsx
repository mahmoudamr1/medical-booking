'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFormat, useT } from '@/i18n/provider';
import { useUnreadCount } from '../hooks/useNotifications';
import { NotificationPanel } from './NotificationPanel';

const BELL_ITEMS = 8;
const BADGE_MAX = 99;

/** Header bell: unread badge plus a popover with the newest notifications. */
export function NotificationBell() {
  const t = useT();
  const f = useFormat();
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unread > 0 ? `${t('nav.notifications')} (${f.number(unread)})` : t('nav.notifications')
          }
        >
          <Bell aria-hidden />
          {unread > 0 && (
            <span
              className="absolute end-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white"
              aria-hidden
            >
              {unread > BADGE_MAX ? `${f.number(BADGE_MAX)}+` : f.number(unread)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-1rem)] gap-0 p-0">
        <NotificationPanel
          title={t('notifications.title')}
          limit={BELL_ITEMS}
          enabled={open}
          scroll
          onNavigate={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
