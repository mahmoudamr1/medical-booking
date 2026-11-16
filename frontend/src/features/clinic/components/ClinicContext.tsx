'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { CurrentUser } from '@/types/api';
import type { ClinicPermission } from '../types';
import { EmptyState } from '@/components/shared/EmptyState';
import { useT } from '@/i18n/provider';

/** One active membership from GET /auth/me → clinics[] (id, names, role, permissions). */
export type ClinicMembership = CurrentUser['clinics'][number];

/** Dashboard URL for a clinic section: /dashboard/clinic/{clinicId}[/section…]. */
export function clinicPath(clinicId: string, ...segments: string[]): string {
  return ['/dashboard/clinic', clinicId, ...segments].join('/');
}

interface ClinicContextValue {
  membership: ClinicMembership;
  clinicId: string;
  /** UX only: hides/disables actions the member's role lacks. The API authorizes every call. */
  can: (permission: ClinicPermission) => boolean;
}

const ClinicContext = createContext<ClinicContextValue | null>(null);

export function ClinicProvider({
  membership,
  children,
}: {
  membership: ClinicMembership;
  children: ReactNode;
}) {
  const value: ClinicContextValue = {
    membership,
    clinicId: membership.id,
    can: (p) => membership.permissions.includes(p),
  };
  return <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>;
}

export function useClinic(): ClinicContextValue {
  const ctx = useContext(ClinicContext);
  if (!ctx) throw new Error('useClinic must be used inside <ClinicProvider>');
  return ctx;
}

/** Forbidden state for sections the member's clinic role cannot open. */
export function RequireClinicPermission({
  permission,
  children,
}: {
  permission: ClinicPermission;
  children: ReactNode;
}) {
  const t = useT();
  const { can } = useClinic();
  if (!can(permission)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        tone="danger"
        title={t('clinic.dash.forbiddenTitle')}
        description={t('clinic.dash.forbiddenBody')}
      />
    );
  }
  return <>{children}</>;
}
