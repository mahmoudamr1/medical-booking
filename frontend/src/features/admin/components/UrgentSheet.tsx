'use client';

import { AdminSheet } from './AdminSheet';
import { useQuery } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { adminApi } from '../api';
import { adminKeys } from '../hooks/keys';
import { UrgentStatusBadge } from '@/features/urgent';
import { DetailList } from './DetailList';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useFormat, useI18n } from '@/i18n/provider';

export function UrgentSheet({
  requestId,
  onClose,
}: {
  requestId: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <AdminSheet open={!!requestId} onClose={onClose} title={t('admin.urgent.detailTitle')}>
      {requestId && <Detail id={requestId} />}
    </AdminSheet>
  );
}

function Detail({ id }: { id: string }) {
  const { t } = useI18n();
  const f = useFormat();
  // Each detail read is audit-logged by the API ("urgent.request.viewed").
  const req = useQuery({
    queryKey: [...adminKeys.urgent, 'detail', id],
    queryFn: () => adminApi.urgentRequest(id),
    staleTime: 30_000,
  });

  if (req.isPending || req.isError) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>{t('admin.urgent.detailTitle')}</SheetTitle>
        </SheetHeader>
        {req.isPending ? (
          <LoadingState />
        ) : (
          <div className="p-4">
            <ErrorState error={req.error} onRetry={() => req.refetch()} />
          </div>
        )}
      </>
    );
  }

  const r = req.data;
  const dt = (v: string | null) => (v ? f.dateTime(v) : null);
  const summary =
    r.dispatch_summary && !Array.isArray(r.dispatch_summary)
      ? Object.entries(r.dispatch_summary)
      : [];

  return (
    <>
      <SheetHeader className="gap-2 border-b pe-12">
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle className="text-lg">{t('admin.urgent.detailTitle')}</SheetTitle>
          <UrgentStatusBadge status={r.status} />
          {r.flagged?.at && (
            <Badge variant="danger">
              <Flag aria-hidden />
              {t('admin.urgent.flagged')}
            </Badge>
          )}
        </div>
        <SheetDescription className="font-mono text-xs" dir="ltr">
          {r.id}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 p-4">
        {r.flagged?.at && (
          <section
            className="rounded-xl border border-red-200 bg-red-50/60 p-4"
            aria-label={t('admin.urgent.flagged')}
          >
            <DetailList
              rows={[
                [t('admin.urgent.flagReason'), r.flagged.reason],
                [t('admin.urgent.flagged'), dt(r.flagged.at)],
              ]}
            />
          </section>
        )}

        <DetailList
          rows={[
            [t('admin.urgent.columns.patient'), r.patient?.name],
            [
              t('admin.urgent.phone'),
              r.patient?.contact_phone ? <span dir="ltr">{r.patient.contact_phone}</span> : null,
            ],
            [t('admin.urgent.columns.specialty'), r.specialty ? f.l(r.specialty) : null],
            [
              t('admin.urgent.consultationType'),
              r.consultation_type &&
              ['in_person', 'online', 'home_visit'].includes(r.consultation_type)
                ? t(`consultation.${r.consultation_type as 'in_person' | 'online' | 'home_visit'}`)
                : r.consultation_type,
            ],
            [
              t('admin.urgent.columns.location'),
              [f.l(r.area), f.l(r.city), f.l(r.governorate)].filter(Boolean).join('، '),
            ],
            [t('admin.urgent.locationDetails'), r.location_details],
            [t('admin.urgent.tier'), r.current_tier !== null ? f.number(r.current_tier) : null],
            [
              t('admin.urgent.gpDisclosure'),
              r.gp_disclosure === null ? null : r.gp_disclosure ? t('common.yes') : t('common.no'),
            ],
          ]}
        />
        {r.description && (
          <DetailList
            className="sm:grid-cols-1"
            rows={[
              [
                t('admin.urgent.description'),
                <span key="d" className="whitespace-pre-line">
                  {r.description}
                </span>,
              ],
            ]}
          />
        )}

        <Separator />
        <section className="space-y-3">
          <h3 className="font-semibold">{t('admin.urgent.acceptedDoctor')}</h3>
          {r.accepted_doctor ? (
            <DetailList
              rows={[
                [
                  t('appointments.doctor'),
                  [r.accepted_doctor.name, f.l(r.accepted_doctor, 'title')]
                    .filter(Boolean)
                    .join(' – '),
                ],
                [
                  t('admin.urgent.phone'),
                  r.accepted_doctor.phone ? <span dir="ltr">{r.accepted_doctor.phone}</span> : null,
                ],
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold">{t('admin.urgent.dispatches')}</h3>
          {summary.length ? (
            <div className="flex flex-wrap gap-2">
              {summary.map(([status, count]) => (
                <Badge key={status} variant="muted" className="h-7 gap-1.5">
                  <span dir="ltr">{status}</span>
                  <span className="font-semibold tabular-nums">{f.number(Number(count))}</span>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('admin.urgent.noDispatches')}</p>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold">{t('admin.urgent.timeline')}</h3>
          <DetailList
            rows={[
              [t('admin.urgent.createdAt'), dt(r.created_at)],
              [t('admin.urgent.acceptedAt'), dt(r.accepted_at)],
              [t('admin.urgent.startedAt'), dt(r.started_at)],
              [t('admin.urgent.closedAt'), dt(r.closed_at)],
              [t('admin.urgent.expiresAt'), dt(r.expires_at)],
              [t('admin.urgent.closeReason'), r.close_reason],
            ]}
          />
        </section>
      </div>
    </>
  );
}
