'use client';

import {
  Clock,
  EyeOff,
  Hourglass,
  MapPin,
  Phone,
  Stethoscope,
  UserRound,
  Users,
  Video,
} from 'lucide-react';
import type { UrgentRequest } from '../../types';
import { isTerminal } from '../../status';
import { UrgentStatusBadge, DirectedBadge, SeverityBadge } from '../badges';
import { useDurationFormat, useNow } from '@/lib/time';
import { DoctorUrgentActions } from './UrgentActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useFormat, useT } from '@/i18n/provider';
import type { TranslationKey } from '@/i18n/translate';
import { cn } from '@/lib/utils';

/** "Area، City، Governorate" (area is only present after acceptance). */
export function useUrgentPlace() {
  const f = useFormat();
  return (r: UrgentRequest) =>
    [f.l(r.area), f.l(r.city), f.l(r.governorate)].filter(Boolean).join('، ');
}

/**
 * Live counter: waiting time for open requests (server `waiting_seconds` anchored at fetch time, so the
 * doctor's clock doesn't matter), or time since acceptance/start for active ones.
 */
export function WaitingTime({
  request: r,
  fetchedAt,
}: {
  request: UrgentRequest;
  fetchedAt: number;
}) {
  const t = useT();
  const now = useNow(1_000);
  const dur = useDurationFormat();
  if (!r.created_at || isTerminal(r.status)) return null;
  const elapsed = (since: string) => now - new Date(since).getTime();
  const [ms, key]: [number, TranslationKey] =
    r.status === 'in_progress' && r.started_at
      ? [elapsed(r.started_at), 'doctorUrgent.requests.inProgressFor']
      : r.status === 'accepted' && r.accepted_at
        ? [elapsed(r.accepted_at), 'doctorUrgent.requests.acceptedAgo']
        : [
            typeof r.waiting_seconds === 'number'
              ? r.waiting_seconds * 1000 + (now - fetchedAt)
              : elapsed(r.created_at),
            'doctorUrgent.requests.waiting',
          ];
  return (
    <span
      className="inline-flex items-center gap-1 font-medium text-amber-700 tabular-nums"
      data-testid="urgent-waiting"
    >
      <Hourglass className="size-3.5" aria-hidden />
      {t(key, { time: dur(ms) })}
    </span>
  );
}

/** Shown when the request escalated to general practitioners (tier 3). */
export function GpBadge({ request: r }: { request: UrgentRequest }) {
  const t = useT();
  if (!r.gp_disclosure) return null;
  return (
    <Badge variant="info" title={t('doctorUrgent.requests.gpDisclosureHint')}>
      <Users aria-hidden />
      {t('doctorUrgent.requests.gpDisclosure')}
    </Badge>
  );
}

/** List card: redacted until this doctor accepts, then shows the patient's name and phone. Critical requests stand out. */
export function UrgentRequestCard({
  request: r,
  fetchedAt,
  onOpen,
}: {
  request: UrgentRequest;
  fetchedAt: number;
  onOpen: () => void;
}) {
  const t = useT();
  const f = useFormat();
  const place = useUrgentPlace();
  const critical = r.severity === 'critical' && !isTerminal(r.status);
  return (
    <Card
      className={cn('gap-0 py-0', critical && 'bg-red-50/40 ring-2 ring-red-500/70')}
      data-testid="urgent-request-card"
      data-id={r.id}
      data-status={r.status}
      data-severity={r.severity}
    >
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-2 font-semibold">
              <Stethoscope className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="truncate">
                {r.specialty ? f.l(r.specialty) : t('doctorUrgent.requests.anySpecialty')}
              </span>
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                {r.consultation_type === 'online' ? (
                  <Video className="size-4" aria-hidden />
                ) : (
                  <UserRound className="size-4" aria-hidden />
                )}
                {t(`consultation.${r.consultation_type}`)}
              </span>
              {(r.city || r.governorate) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-4" aria-hidden />
                  {place(r)}
                </span>
              )}
              {r.created_at && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-4" aria-hidden />
                  {f.dateTime(r.created_at)}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <SeverityBadge severity={r.severity} />
            <DirectedBadge request={r} />
            <GpBadge request={r} />
            <UrgentStatusBadge status={r.status} />
          </div>
        </div>
        <p className="line-clamp-3 text-sm text-foreground/90">{r.description}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <WaitingTime request={r} fetchedAt={fetchedAt} />
          {!!r.unread_messages && (
            <Badge variant="info">
              {t('doctorUrgent.requests.unread', { count: f.number(r.unread_messages) })}
            </Badge>
          )}
          {r.patient ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <UserRound className="size-4 text-muted-foreground" aria-hidden />
              <span className="truncate">{r.patient.name}</span>
              {r.patient.contact_phone && (
                <a
                  href={`tel:${r.patient.contact_phone}`}
                  className="inline-flex min-h-9 items-center gap-1 font-medium text-primary"
                  dir="ltr"
                >
                  <Phone className="size-4" aria-hidden />
                  {r.patient.contact_phone}
                </a>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <EyeOff className="size-4" aria-hidden />
              {t('doctorUrgent.requests.hiddenUntilAccept')}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-4 py-3 sm:px-5">
        <Button size="sm" variant="outline" onClick={onOpen}>
          {t('doctorUrgent.requests.view')}
        </Button>
        <div className="flex flex-wrap gap-2">
          <DoctorUrgentActions request={r} />
        </div>
      </div>
    </Card>
  );
}
