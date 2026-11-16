'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell, CalendarDays, Siren, UserCog } from 'lucide-react';
import {
  NAV_BADGE_STALE_MS,
  type DashboardNavGroup,
} from '@/components/layout/dashboard/nav-types';

import { notificationsApi, notificationKeys } from '@/features/notifications';
import { useT } from '@/i18n/provider';
import { useAuth } from '@/lib/auth/AuthProvider';

export function usePatientNav(): DashboardNavGroup[] {
  const t = useT();
  const { user } = useAuth();
  // Same key as the header bell → no extra request.
  const unread = useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: notificationsApi.unreadCount,
    enabled: !!user,
    staleTime: NAV_BADGE_STALE_MS,
  });
  return [
    {
      items: [
        {
          href: '/dashboard/patient',
          label: t('patient.navAppointments'),
          icon: CalendarDays,
          exact: true,
          tab: true,
        },
        { href: '/urgent/history', label: t('nav.urgent'), icon: Siren, tab: true },
      ],
    },
    {
      label: t('dashboard.groups.account'),
      items: [
        {
          href: '/dashboard/patient/profile',
          label: t('patient.navProfile'),
          icon: UserCog,
          tab: true,
        },
        {
          href: '/notifications',
          label: t('patient.navNotifications'),
          icon: Bell,
          badge: unread.data?.unread,
          tab: true,
        },
      ],
    },
  ];
}
