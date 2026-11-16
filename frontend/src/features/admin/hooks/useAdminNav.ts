'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  MessageSquareWarning,
  Settings,
  Siren,
  Stethoscope,
  Tags,
  Users,
} from 'lucide-react';
import {
  NAV_BADGE_STALE_MS,
  type DashboardNavGroup,
} from '@/components/layout/dashboard/nav-types';
import { useT } from '@/i18n/provider';
import { hasRole, useAuth } from '@/lib/auth/AuthProvider';
import { adminApi } from '../api';
import { adminKeys } from './keys';

export function useAdminNav(): DashboardNavGroup[] {
  const t = useT();
  const { user } = useAuth();
  // Same key/shape as the overview page's default range → one shared request.
  const stats = useQuery({
    queryKey: [...adminKeys.stats, {}],
    queryFn: () => adminApi.stats({}),
    enabled: hasRole(user, 'admin'),
    staleTime: NAV_BADGE_STALE_MS,
  });
  const s = stats.data;
  return [
    {
      items: [
        {
          href: '/dashboard/admin',
          label: t('admin.nav.overview'),
          icon: LayoutDashboard,
          exact: true,
          tab: true,
        },
      ],
    },
    {
      label: t('dashboard.groups.people'),
      items: [
        {
          href: '/dashboard/admin/doctors',
          label: t('admin.nav.doctors'),
          icon: Stethoscope,
          badge: s?.people.pending_verifications,
          badgeTone: 'warning',
          tab: true,
        },
        { href: '/dashboard/admin/users', label: t('admin.nav.users'), icon: Users },
        { href: '/dashboard/admin/clinics', label: t('admin.nav.clinics'), icon: Building2 },
      ],
    },
    {
      label: t('dashboard.groups.operations'),
      items: [
        {
          href: '/dashboard/admin/appointments',
          label: t('admin.nav.appointments'),
          icon: CalendarDays,
          tab: true,
        },
        {
          href: '/dashboard/admin/urgent',
          label: t('admin.nav.urgent'),
          icon: Siren,
          badge: s?.urgent.flagged,
          badgeTone: 'danger',
          tab: true,
        },
        {
          href: '/dashboard/admin/reviews',
          label: t('admin.nav.reviews'),
          icon: MessageSquareWarning,
          badge: s?.reviews.open_reports,
          badgeTone: 'warning',
        },
      ],
    },
    {
      label: t('dashboard.groups.system'),
      items: [
        { href: '/dashboard/admin/specialties', label: t('admin.nav.specialties'), icon: Tags },
        { href: '/dashboard/admin/audit', label: t('admin.nav.audit'), icon: ClipboardList },
        { href: '/dashboard/admin/settings', label: t('admin.nav.settings'), icon: Settings },
      ],
    },
  ];
}
