'use client';

import { ToneBadge } from '@/components/shared/StatusBadge';
import { useT } from '@/i18n/provider';
import type { ClinicStatus, ReportStatus, ReviewStatus, UserStatus } from '../types';

type Tone = 'success' | 'warning' | 'info' | 'muted' | 'danger';

export function AccountStatusBadge({ status }: { status: UserStatus }) {
  const t = useT();
  return (
    <ToneBadge tone={status === 'active' ? 'success' : 'danger'}>
      {t(`admin.users.status.${status}`)}
    </ToneBadge>
  );
}

export function ClinicStatusBadge({ status }: { status: ClinicStatus }) {
  const t = useT();
  return (
    <ToneBadge tone={status === 'active' ? 'success' : 'danger'}>
      {t(`admin.clinics.status.${status}`)}
    </ToneBadge>
  );
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const t = useT();
  return (
    <ToneBadge tone={status === 'published' ? 'success' : 'muted'}>
      {t(`admin.reviews.status.${status}`)}
    </ToneBadge>
  );
}

const REPORT_TONE: Record<ReportStatus, Tone> = {
  open: 'warning',
  resolved: 'success',
  dismissed: 'muted',
};

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const t = useT();
  return (
    <ToneBadge tone={REPORT_TONE[status] ?? 'muted'}>
      {t(`admin.reviews.reportStatus.${status}`)}
    </ToneBadge>
  );
}
