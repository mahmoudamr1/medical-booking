'use client';

import { usePathname } from 'next/navigation';
import { RequireAuth } from '@/features/auth';
import { DashboardShell } from '@/components/layout/dashboard/DashboardShell';
import { fallbackNav } from '@/components/layout/dashboard/fallbackNav';
import {
  useDoctorNav,
  VerificationBanner,
  useDoctorProfile,
  doctorApi,
  doctorKeys,
} from '@/features/doctor';
import { useQuery } from '@tanstack/react-query';
import { hasRole, useAuth } from '@/lib/auth/AuthProvider';
import { useT } from '@/i18n/provider';

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const { user } = useAuth();
  const isDoctor = hasRole(user, 'doctor');
  const status = user?.doctor_profile?.verification_status;
  const nav = useDoctorNav(status);
  // The signed-in doctor's photo, when the profile endpoint provides one.
  const avatarUrl = useDoctorAvatar(isDoctor);

  return (
    <DashboardShell
      title={t('doctorDash.title')}
      homeHref="/dashboard/doctor"
      nav={isDoctor ? nav : fallbackNav(user, t)}
      roleLabel={isDoctor ? t('dashboard.roles.doctor') : undefined}
      avatarUrl={avatarUrl}
    >
      <RequireAuth role="doctor">
        <DoctorBanner />
        {children}
      </RequireAuth>
    </DashboardShell>
  );
}

function useDoctorAvatar(enabled: boolean): string | null {
  // Same key as useDoctorProfile (shared cache), but only fetched for doctors.
  const profile = useQuery({ queryKey: doctorKeys.profile, queryFn: doctorApi.profile, enabled });
  if (!enabled) return null;
  const data = profile.data as { avatar_url?: string | null } | undefined;
  return data?.avatar_url ?? null;
}

function DoctorBanner() {
  const pathname = usePathname();
  const profile = useDoctorProfile();
  const status = profile.data?.verification_status;
  if (!status || status === 'approved' || pathname.startsWith('/dashboard/doctor/verification'))
    return null;
  return <VerificationBanner status={status} notes={profile.data?.verification_notes} />;
}
