import type { Widen } from '@/i18n/types';
import type { notificationsAr } from './ar';

export const notificationsEn: Widen<typeof notificationsAr> = {
  notifications: {
    title: 'Notifications',
    recentTitle: 'Recent notifications',
    markAllRead: 'Mark all as read',
    markRead: 'Mark as read',
    empty: 'No notifications',
    viewAll: 'View all notifications',
    unread: 'Unread',
  },
};
