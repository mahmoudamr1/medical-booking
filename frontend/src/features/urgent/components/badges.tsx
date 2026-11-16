'use client';

import { AlertOctagon, AlertTriangle, CircleDot, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ToneBadge } from '@/components/shared/StatusBadge';
import { useT } from '@/i18n/provider';
import type { UrgentRequest, UrgentSeverity, UrgentStatus } from '../types';

const STATUS_TONE: Record<UrgentStatus, 'success' | 'warning' | 'info' | 'muted'> = {
  created: 'warning',
  searching: 'warning',
  notifying: 'warning',
  accepted: 'info',
  in_progress: 'success',
  completed: 'info',
  cancelled: 'muted',
  unmatched: 'muted',
  expired: 'muted',
};

/** Urgent request status, used by patient, doctor and admin screens. */
export function UrgentStatusBadge({ status }: { status: UrgentStatus }) {
  const t = useT();
  return (
    <ToneBadge tone={STATUS_TONE[status] ?? 'muted'}>{t(`urgent.status.${status}`)}</ToneBadge>
  );
}

/** Patient-reported severity (a routing choice, never a diagnosis). */
export function SeverityBadge({ severity }: { severity?: UrgentSeverity }) {
  const t = useT();
  if (!severity) return null;
  const Icon =
    severity === 'critical' ? AlertOctagon : severity === 'urgent' ? AlertTriangle : CircleDot;
  return (
    <Badge
      variant={severity === 'critical' ? 'danger' : severity === 'urgent' ? 'warning' : 'muted'}
      data-severity={severity}
    >
      <Icon aria-hidden />
      {t(`urgent.severity.${severity}`)}
    </Badge>
  );
}

/** Shown to a doctor when the patient picked them by name. */
export function DirectedBadge({ request: r }: { request: UrgentRequest }) {
  const t = useT();
  if (!r.directed_to_me) return null;
  return (
    <Badge variant="info" data-testid="directed-to-me">
      <UserCheck aria-hidden />
      {t('doctorUrgent.requests.directedToMe')}
    </Badge>
  );
}
