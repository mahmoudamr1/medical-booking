'use client';

import { Suspense } from 'react';
import { RequireAuth } from '@/features/auth';
import { DashboardShell } from '@/components/layout/dashboard/DashboardShell';
import { fallbackNav } from '@/components/layout/dashboard/fallbackNav';
import { useAdminNav } from '@/features/admin';
import { LoadingState } from '@/components/shared/states';
import { hasRole, useAuth } from '@/lib/auth/AuthProvider';
import { useT } from '@/i18n/provider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const { user } = useAuth();
  const adminNav = useAdminNav();
  const isAdmin = hasRole(user, 'admin');

  return (
    <DashboardShell
      title={t('admin.title')}
      homeHref="/dashboard/admin"
      nav={isAdmin ? adminNav : fallbackNav(user, t)}
      roleLabel={isAdmin ? t('dashboard.roles.admin') : undefined}
    >
      {/* RequireAuth keeps the forbidden state for non-admins; admin pages keep filters in the query string. */}
      <Suspense fallback={<LoadingState />}>
        <RequireAuth role="admin">{children}</RequireAuth>
      </Suspense>
    </DashboardShell>
  );
}
