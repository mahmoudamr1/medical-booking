'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useT } from '@/i18n/provider';
import { errorMessage } from '@/lib/api/errors';
import { notificationsApi } from '../api';
import { notificationKeys } from './keys';

const UNREAD_POLL_MS = 30_000;

/** Total unread notifications (bell badge, nav badges, "mark all read"); polled while the tab is visible. */
export function useUnreadCount(enabled = true): number {
  const { data } = useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: notificationsApi.unreadCount,
    enabled,
    refetchInterval: UNREAD_POLL_MS,
    refetchIntervalInBackground: false,
  });
  return data?.unread ?? 0;
}

/** One page of notifications, newest first. */
export function useNotificationList(page = 1, enabled = true) {
  return useQuery({
    queryKey: notificationKeys.list(page),
    queryFn: () => notificationsApi.list(page),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** Mark one / all as read; every notification query (lists and the unread count) then refetches. */
export function useMarkNotifications() {
  const t = useT();
  const queryClient = useQueryClient();
  const handlers = {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
    onError: (e: unknown) => toast.error(errorMessage(e, t)),
  };
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, ...handlers });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, ...handlers });
  return { markRead, markAll };
}
