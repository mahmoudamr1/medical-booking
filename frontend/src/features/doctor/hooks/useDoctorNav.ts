'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  CalendarDays,
  CalendarOff,
  Clock,
  HeartHandshake,
  LayoutDashboard,
  Settings2,
  Siren,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import {
  NAV_BADGE_STALE_MS,
  type DashboardNavGroup,
} from '@/components/layout/dashboard/nav-types';
import { URGENT_KEYS, urgentApi } from '@/features/urgent';
import { useT } from '@/i18n/provider';
import { hasRole, useAuth } from '@/lib/auth/AuthProvider';

export function useDoctorNav(verificationStatus: string | undefined): DashboardNavGroup[] {
  const t = useT();
  const { user } = useAuth();
  const volunteering = hasRole(user, 'doctor') && user?.doctor_profile?.volunteer_active === true;
  // Shares the cache of the urgent requests page ("open" tab).
  const open = useQuery({
    queryKey: URGENT_KEYS.doctorList('open'),
    queryFn: () => urgentApi.doctorList('open'),
    enabled: volunteering,
    staleTime: NAV_BADGE_STALE_MS,
  });
  const needsVerification = !!verificationStatus && verificationStatus !== 'approved';
  return [
    {
      items: [
        {
          href: '/dashboard/doctor',
          label: t('doctorDash.nav.overview'),
          icon: LayoutDashboard,
          exact: true,
          tab: true,
        },
        {
          href: '/dashboard/doctor/calendar',
          label: t('doctorDash.nav.calendar'),
          icon: CalendarDays,
          tab: true,
        },
      ],
    },
    {
      label: t('dashboard.groups.practice'),
      items: [
        { href: '/dashboard/doctor/schedule', label: t('doctorDash.nav.schedule'), icon: Clock },
        {
          href: '/dashboard/doctor/exceptions',
          label: t('doctorDash.nav.exceptions'),
          icon: CalendarOff,
        },
        {
          href: '/dashboard/doctor/services',
          label: t('doctorDash.nav.services'),
          icon: Stethoscope,
        },
        {
          href: '/dashboard/doctor/preferences',
          label: t('doctorDash.nav.preferences'),
          icon: Settings2,
        },
      ],
    },
    {
      label: t('dashboard.groups.urgent'),
      items: [
        {
          href: '/dashboard/doctor/urgent',
          label: t('doctorUrgent.nav.requests'),
          icon: Siren,
          badge: open.data?.pagination.total,
          badgeTone: 'danger',
          tab: true,
        },
        {
          href: '/dashboard/doctor/volunteer',
          label: t('doctorUrgent.nav.volunteer'),
          icon: HeartHandshake,
        },
      ],
    },
    {
      label: t('dashboard.groups.account'),
      items: [
        {
          href: '/dashboard/doctor/profile',
          label: t('doctorDash.nav.profile'),
          icon: UserRound,
          tab: true,
        },
        {
          href: '/dashboard/doctor/verification',
          label: t('doctorDash.nav.verification'),
          icon: BadgeCheck,
          badge: needsVerification ? 'dot' : undefined,
          badgeTone: 'warning',
        },
      ],
    },
  ];
}
