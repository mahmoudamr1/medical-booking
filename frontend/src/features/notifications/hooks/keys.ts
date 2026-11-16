/** Notification query keys; invalidating `all` refreshes the bell, lists and badges. */
export const notificationKeys = {
  all: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  recent: ['notifications', 'recent'] as const,
  /** Page 1 is shared by the header bell, the dashboard card and the notifications page. */
  list: (page: number) => ['notifications', 'list', page] as const,
};

export default notificationKeys;
