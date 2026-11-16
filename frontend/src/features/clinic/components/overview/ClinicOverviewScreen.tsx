'use client';

import { Reports } from './ClinicReports';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useClinic, clinicPath } from '../ClinicContext';
import { ClinicUrgentAvailability } from '../ClinicUrgentAvailability';
import { clinicApi } from '../../api';
import { clinicKeys } from '../../hooks/keys';
import { CLINIC_PERMISSIONS as P } from '../../types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ErrorState, LoadingState, Section } from '@/components/shared/states';
import { PageHeader } from '@/components/shared/PageHeader';
import { buttonVariants } from '@/components/ui/button';
import { BUSINESS_TZ, addDaysToKey, todayKey, zonedDayStartIso } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';

export function ClinicOverviewScreen() {
  const t = useT();
  const f = useFormat();
  const { membership, can } = useClinic();

  return (
    <>
      <PageHeader title={f.l(membership)} description={t('clinic.overview.title')} />
      {can(P.viewReports) ? (
        <Reports />
      ) : (
        <p className="rounded-xl border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground">
          {t('clinic.overview.noReportsAccess')}
        </p>
      )}
      {can(P.viewAppointments) && <TodayAppointments />}
      {can(P.viewSchedules) && <ClinicUrgentAvailability />}
    </>
  );
}

function TodayAppointments() {
  const t = useT();
  const f = useFormat();
  const { clinicId } = useClinic();
  const today = todayKey(BUSINESS_TZ);
  const query = useQuery({
    queryKey: clinicKeys.of(clinicId, 'appointments', 'today', today),
    queryFn: () =>
      clinicApi.appointments(clinicId, {
        from: zonedDayStartIso(today, BUSINESS_TZ),
        to: zonedDayStartIso(addDaysToKey(today, 1), BUSINESS_TZ),
        per_page: 8,
      }),
  });

  return (
    <Section
      title={t('clinic.extra.todayTitle')}
      actions={
        <Link
          href={clinicPath(clinicId, 'appointments')}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          {t('common.viewAll')}
        </Link>
      }
    >
      {query.isPending ? (
        <LoadingState rows={3} className="[&>*]:h-14" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {t('clinic.extra.todayEmpty')}
        </p>
      ) : (
        <ul className="divide-y">
          {query.data.items.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="font-medium">
                  <span className="tabular-nums">
                    {f.time(a.starts_at, a.timezone ?? BUSINESS_TZ)}
                  </span>{' '}
                  · {a.patient?.name ?? '—'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {a.doctor?.name}
                  {a.branch ? ` · ${f.l(a.branch)}` : ''}
                </p>
              </div>
              <StatusBadge status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
