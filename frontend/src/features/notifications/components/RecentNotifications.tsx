'use client';

import { Card } from '@/components/ui/card';
import { useT } from '@/i18n/provider';
import { NotificationPanel } from './NotificationPanel';

const RECENT_ITEMS = 5;

/** Dashboard card with the newest notifications (same cache as the header bell). */
export function RecentNotifications() {
  const t = useT();
  return (
    <Card className="gap-0 py-0" data-testid="recent-notifications">
      <NotificationPanel title={t('notifications.recentTitle')} limit={RECENT_ITEMS} />
    </Card>
  );
}
