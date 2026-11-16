'use client';

import type { AppointmentStatus, VerificationStatus } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

type Tone = 'success' | 'warning' | 'info' | 'muted' | 'danger';

const STATUS_TONE: Record<AppointmentStatus, Tone> = {
  pending_confirmation: 'warning',
  confirmed: 'success',
  completed: 'info',
  cancelled_by_patient: 'muted',
  cancelled_by_doctor: 'muted',
  cancelled_by_clinic: 'muted',
  cancelled_by_admin: 'muted',
  rejected: 'danger',
  expired: 'muted',
  no_show: 'danger',
};

/** Tailwind classes for compact calendar chips. */
const CHIP: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  muted: 'bg-slate-100 text-slate-700 ring-slate-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
};

export function statusVariant(status: AppointmentStatus): Tone {
  return STATUS_TONE[status] ?? 'muted';
}

export function statusTone(status: AppointmentStatus): string {
  return CHIP[statusVariant(status)];
}

export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  const t = useT();
  return (
    <Badge data-status={status} variant={statusVariant(status)} className={cn(className)}>
      {t(`status.${status}`)}
    </Badge>
  );
}

const VERIFICATION_TONE: Record<VerificationStatus, Tone> = {
  draft: 'muted',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  suspended: 'danger',
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const t = useT();
  return <Badge variant={VERIFICATION_TONE[status]}>{t(`verification.${status}`)}</Badge>;
}

/** Generic badge for any status string with an explicit tone. */
export function ToneBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <Badge variant={tone}>{children}</Badge>;
}
