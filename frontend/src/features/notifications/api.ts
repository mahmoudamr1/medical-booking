/** In-app notifications. */
import { api } from '@/lib/api/client';
import type { AppNotification, UnreadCount } from './types';

/** One page size everywhere, so the bell, the dashboard card and the page read the same cache. */
const PER_PAGE = 20;

export const notificationsApi = {
  list: (page: number) =>
    api.page<AppNotification>('/notifications', { page, per_page: PER_PAGE }),
  unreadCount: () => api.get<UnreadCount>('/notifications/unread-count'),
  markRead: (id: string) => api.post<AppNotification>(`/notifications/${id}/read`),
  markAllRead: () => api.post<UnreadCount>('/notifications/read-all'),
};
