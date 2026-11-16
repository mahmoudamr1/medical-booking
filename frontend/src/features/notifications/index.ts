/** Public surface of the notifications feature — other features and app routes import only from here. */
export { NotificationBell } from './components/NotificationBell';
export { NotificationsScreen } from './components/NotificationsScreen';
export { RecentNotifications } from './components/RecentNotifications';
export { useUnreadCount, useNotificationList, useMarkNotifications } from './hooks/useNotifications';
export { notificationsApi } from './api';
export { notificationKeys } from './hooks/keys';
export { notificationText, notificationHref } from './content';
export type { AppNotification, UnreadCount } from './types';
