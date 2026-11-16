'use client';

import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { RequireAuth } from '@/features/auth';
import { DashboardShell } from '@/components/layout/dashboard/DashboardShell';
import { EmptyState } from '@/components/shared/EmptyState';
import { fallbackNav } from '@/components/layout/dashboard/fallbackNav';
import {
  useClinicNav,
  ClinicInvitations,
  ClinicProvider,
  ClinicSwitcher,
  roleKey,
} from '@/features/clinic';
import { LoadingState } from '@/components/shared/states';
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useT } from '@/i18n/provider';

export default function ClinicDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingState className="py-24" />}>
      <ClinicShell>{children}</ClinicShell>
    </Suspense>
  );
}

/**
 * Membership comes from GET /auth/me → clinics[]; the ClinicProvider exposes its permissions
 * (nav items and actions are hidden for missing permissions; the API authorizes every call).
 */
function ClinicShell({ children }: { children: ReactNode }) {
  const t = useT();
  const { user } = useAuth();
  const { clinicId } = useParams<{ clinicId: string }>();
  const clinics = user?.clinics ?? [];
  const membership = clinics.find((c) => c.id === clinicId);
  const nav = useClinicNav(clinicId, membership);

  return (
    <DashboardShell
      title={t('clinic.dash.title')}
      homeHref={membership ? `/dashboard/clinic/${clinicId}` : '/dashboard/clinic'}
      nav={membership ? nav : fallbackNav(user, t)}
      roleLabel={membership ? t(roleKey(membership.role)) : undefined}
      sidebarTop={
        membership
          ? ({ rail }) => <ClinicSwitcher current={membership} clinics={clinics} rail={rail} />
          : undefined
      }
    >
      <RequireAuth>
        {membership ? (
          <ClinicProvider membership={membership}>
            <ClinicInvitations />
            {children}
          </ClinicProvider>
        ) : (
          <EmptyState
            className="py-16"
            icon={Building2}
            title={t('clinic.dash.notMemberTitle')}
            description={t('clinic.dash.notMemberBody')}
            action={
              <Link href="/dashboard/clinic" className={buttonVariants({ variant: 'outline' })}>
                {t('clinic.dash.backToClinics')}
              </Link>
            }
          />
        )}
      </RequireAuth>
    </DashboardShell>
  );
}
