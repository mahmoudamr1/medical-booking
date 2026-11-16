'use client';

import { RequireAuth } from '@/features/auth';
import { DashboardShell } from '@/components/layout/dashboard/DashboardShell';
import { usePatientNav } from '@/features/patient';
import { useT } from '@/i18n/provider';

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const nav = usePatientNav();

  return (
    <DashboardShell
      title={t('nav.patientDashboard')}
      homeHref="/dashboard/patient"
      nav={nav}
      roleLabel={t('dashboard.roles.patient')}
    >
      <RequireAuth>{children}</RequireAuth>
    </DashboardShell>
  );
}
