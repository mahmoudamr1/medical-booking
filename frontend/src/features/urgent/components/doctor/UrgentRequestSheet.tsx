'use client';

import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, EyeOff, MapPin, Phone, Stethoscope, UserRound, Video } from 'lucide-react';
import { isTerminal } from '../../status';
import { UrgentStatusBadge, DirectedBadge, SeverityBadge } from '../badges';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { DetailSheet } from '@/components/shared/DetailSheet';
import { DoctorUrgentActions, doctorUrgentActions } from './UrgentActions';
import { GpBadge, WaitingTime, useUrgentPlace } from './UrgentRequestCard';
import { UrgentMessageThread } from './UrgentMessageThread';
import { Badge } from '@/components/ui/badge';
import { URGENT_KEYS } from '../../hooks/keys';
import { urgentApi } from '../../api';
import { useFormat, useT } from '@/i18n/provider';
import type { TranslationKey } from '@/i18n/translate';

function Row({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex gap-3 border-b pb-3 last:border-0">
      <span className="mt-0.5 text-muted-foreground [&_svg]:size-4" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm">{children}</dd>
      </div>
    </div>
  );
}

/** Detail sheet (GET /urgent-requests/{id}, polled): redacted by the API until this doctor accepts. */
export function UrgentRequestSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = useT();
  const f = useFormat();
  const place = useUrgentPlace();
  const query = useQuery({
    queryKey: URGENT_KEYS.request(id ?? ''),
    queryFn: () => urgentApi.show(id!),
    enabled: !!id,
    refetchInterval: 10_000,
  });
  const r = query.data;
  const ready = !!id && !!r && query.isSuccess;
  const times: [TranslationKey, string | null][] = r
    ? [
        ['doctorUrgent.requests.acceptedAt', r.accepted_at],
        ['doctorUrgent.requests.startedAt', r.started_at],
        ['doctorUrgent.requests.closedAt', r.closed_at],
        ['doctorUrgent.requests.expiresAt', isTerminal(r.status) ? null : r.expires_at],
      ]
    : [];

  return (
    <DetailSheet
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      title={t('doctorUrgent.requests.detailTitle')}
      description={ready && r.created_at ? f.dateTime(r.created_at) : undefined}
      footer={
        ready && doctorUrgentActions(r).length > 0 ? <DoctorUrgentActions request={r} /> : undefined
      }
    >
      {query.isPending ? (
        <LoadingState rows={3} />
      ) : query.isError || !r ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <div className="space-y-5" data-testid="urgent-detail">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={r.severity} />
            <DirectedBadge request={r} />
            <UrgentStatusBadge status={r.status} />
            <GpBadge request={r} />
            {r.my_dispatch_status && (
              <Badge variant="outline">
                {t('doctorUrgent.requests.yourDispatch', {
                  status: t(
                    `doctorUrgent.requests.dispatch.${r.my_dispatch_status}` as TranslationKey,
                  ),
                })}
              </Badge>
            )}
            {r.current_tier ? (
              <Badge variant="muted">
                {t('doctorUrgent.requests.tier', { tier: f.number(r.current_tier) })}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm">
            <WaitingTime request={r} fetchedAt={query.dataUpdatedAt} />
          </p>
          {r.gp_disclosure && (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
              {t('doctorUrgent.requests.gpDisclosureHint')}
            </p>
          )}

          <dl className="grid gap-3">
            <Row label={t('doctorUrgent.requests.specialty')} icon={<Stethoscope />}>
              {r.specialty ? f.l(r.specialty) : t('doctorUrgent.requests.anySpecialty')}
            </Row>
            <Row
              label={t('doctorUrgent.requests.type')}
              icon={r.consultation_type === 'online' ? <Video /> : <UserRound />}
            >
              {t(`consultation.${r.consultation_type}`)}
            </Row>
            <Row label={t('doctorUrgent.requests.descriptionLabel')} icon={<AlertTriangle />}>
              <span className="whitespace-pre-line">{r.description}</span>
            </Row>
            <Row label={t('doctorUrgent.requests.location')} icon={<MapPin />}>
              {place(r) || '—'}
            </Row>
            {r.location_details && (
              <Row label={t('doctorUrgent.requests.locationDetails')} icon={<MapPin />}>
                {r.location_details}
              </Row>
            )}
          </dl>

          {r.patient ? (
            <div
              className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4"
              data-testid="urgent-patient-contact"
            >
              <p className="text-xs font-medium text-emerald-800">
                {t('doctorUrgent.requests.patient')}
              </p>
              <p className="flex items-center gap-2 font-semibold">
                <UserRound className="size-4" aria-hidden />
                {r.patient.name}
              </p>
              {r.patient.contact_phone && (
                <a
                  href={`tel:${r.patient.contact_phone}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-card px-3 font-medium text-primary ring-1 ring-emerald-200"
                  dir="ltr"
                >
                  <Phone className="size-4" aria-hidden />
                  {r.patient.contact_phone}
                </a>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
              <EyeOff className="size-4 shrink-0" aria-hidden />
              {t('doctorUrgent.requests.redacted')}
            </p>
          )}

          {r.outcome_note && (
            <div className="rounded-xl border bg-muted/40 p-4" data-testid="urgent-outcome">
              <p className="text-xs text-muted-foreground">
                {t('doctorUrgent.requests.outcomeNote')}
              </p>
              <p className="text-sm whitespace-pre-line" dir="auto">
                {r.outcome_note}
              </p>
            </div>
          )}

          {/* Thread: only the accepted doctor (who sees the patient) and the patient are participants. */}
          {r.patient && ['accepted', 'in_progress', 'completed'].includes(r.status) && (
            <UrgentMessageThread
              requestId={r.id}
              open={!!id}
              canSend={r.status === 'accepted' || r.status === 'in_progress'}
            />
          )}

          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {times
              .filter(([, v]) => v)
              .map(([label, v]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{t(label)}</dt>
                  <dd>{f.dateTime(v!)}</dd>
                </div>
              ))}
          </dl>
        </div>
      )}
    </DetailSheet>
  );
}
