'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CalendarCheck,
  CalendarClock,
  LayoutDashboard,
  Settings2,
  Stethoscope,
  Users,
} from 'lucide-react';
import {
  NAV_BADGE_STALE_MS,
  type DashboardNavGroup,
  type DashboardNavItem,
} from '@/components/layout/dashboard/nav-types';
import { useT } from '@/i18n/provider';
import { clinicApi } from '../api';
import type { ClinicMembership } from '../components/ClinicContext';
import { CLINIC_PERMISSIONS as P, type ClinicPermission } from '../types';
import { clinicKeys } from './keys';

export function useClinicNav(
  clinicId: string,
  membership: ClinicMembership | undefined,
): DashboardNavGroup[] {
  const t = useT();
  const can = (p?: ClinicPermission) => !p || !!membership?.permissions.includes(p);
  // Upcoming appointments awaiting confirmation: a per_page=1 request, only its total is used.
  const pending = useQuery({
    queryKey: clinicKeys.of(clinicId, 'appointments', 'pending-count'),
    queryFn: () =>
      clinicApi.appointments(clinicId, {
        status: 'pending_confirmation',
        from: new Date().toISOString(),
        per_page: 1,
      }),
    enabled: !!membership && can(P.viewAppointments),
    staleTime: NAV_BADGE_STALE_MS,
  });
  if (!membership) return [];
  const path = (...s: string[]) => ['/dashboard/clinic', clinicId, ...s].join('/');
  const items = (list: (DashboardNavItem & { permission?: ClinicPermission })[]) =>
    list.filter((i) => can(i.permission));
  return [
    {
      items: [
        {
          href: path(),
          label: t('clinic.dash.nav.overview'),
          icon: LayoutDashboard,
          exact: true,
          tab: true,
        },
      ],
    },
    {
      label: t('dashboard.groups.operations'),
      items: items([
        {
          href: path('appointments'),
          label: t('clinic.dash.nav.appointments'),
          icon: CalendarCheck,
          permission: P.viewAppointments,
          badge: pending.data?.pagination.total,
          badgeTone: 'warning',
          tab: true,
        },
        {
          href: path('schedules'),
          label: t('clinic.dash.nav.schedules'),
          icon: CalendarClock,
          permission: P.viewSchedules,
        },
      ]),
    },
    {
      label: t('dashboard.groups.team'),
      items: items([
        {
          href: path('doctors'),
          label: t('clinic.dash.nav.doctors'),
          icon: Stethoscope,
          permission: P.viewSchedules,
          tab: true,
        },
        {
          href: path('staff'),
          label: t('clinic.dash.nav.staff'),
          icon: Users,
          permission: P.manageStaff,
        },
      ]),
    },
    {
      label: t('dashboard.groups.clinic'),
      items: [
        {
          href: path('branches'),
          label: t('clinic.dash.nav.branches'),
          icon: Building2,
          tab: true,
        },
        { href: path('settings'), label: t('clinic.dash.nav.settings'), icon: Settings2 },
      ],
    },
  ];
}
