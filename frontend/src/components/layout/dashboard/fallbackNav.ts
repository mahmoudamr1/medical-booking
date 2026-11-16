import { Building2, CalendarDays, LayoutDashboard, Stethoscope } from 'lucide-react';
import type { TFunction } from '@/i18n/translate';
import { dashboardLinks } from '@/lib/auth/AuthProvider';
import type { DashboardNavGroup } from './nav-types';

/** Used while a guard blocks an area (forbidden, not a member): links to the user's own dashboards. */
export function fallbackNav(
  user: Parameters<typeof dashboardLinks>[0],
  t: TFunction,
): DashboardNavGroup[] {
  const icons = {
    patientDashboard: CalendarDays,
    doctorDashboard: Stethoscope,
    clinicDashboard: Building2,
    adminDashboard: LayoutDashboard,
  } as const;
  const links = dashboardLinks(user);
  if (links.length === 0) return [];
  return [
    {
      items: links.map((l) => ({
        href: l.href,
        label: t(`nav.${l.key}`),
        icon: icons[l.key],
        tab: true,
      })),
    },
  ];
}
