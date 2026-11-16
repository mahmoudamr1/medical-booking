'use client';

import { useQuery } from '@tanstack/react-query';
import { HeartHandshake } from 'lucide-react';
import { useClinic } from './ClinicContext';
import { Pager, useClientPage } from '@/components/shared/ClientPager';
import { AvailableDoctorRow, URGENT_KEYS, urgentApi } from '@/features/urgent';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState, Section, Skeleton } from '@/components/shared/states';
import { Badge } from '@/components/ui/badge';
import { useFormat, useT } from '@/i18n/provider';

/**
 * "Urgent availability" card on the clinic overview (GET /clinics/{clinic}/urgent-availability,
 * permission schedules.view): the clinic's volunteer doctors, available-now first.
 */
export function ClinicUrgentAvailability() {
  const t = useT();
  const f = useFormat();
  const { clinicId } = useClinic();
  const query = useQuery({
    queryKey: URGENT_KEYS.clinicAvailability(clinicId),
    queryFn: () => urgentApi.clinicAvailability(clinicId),
    refetchInterval: 60_000,
  });
  const doctors = [...(query.data?.doctors ?? [])].sort(
    (a, b) => Number(b.available_now) - Number(a.available_now),
  );
  const { pageItems, meta, setPage } = useClientPage(doctors, 8);
  const availableCount = doctors.filter((d) => d.available_now).length;

  return (
    <Section
      title={t('clinic.urgentAvailability.title')}
      description={t('clinic.urgentAvailability.subtitle')}
      actions={
        query.data && (
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="success">
              {t('clinic.urgentAvailability.availableNow')}: {f.number(availableCount)}
            </Badge>
            <Badge variant="muted">
              {t('clinic.urgentAvailability.total', {
                count: f.number(query.data.volunteers_total),
              })}
            </Badge>
          </div>
        )
      }
      className="gap-3"
    >
      {query.isPending ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : doctors.length === 0 ? (
        <EmptyState
          compact
          icon={HeartHandshake}
          tone="muted"
          title={t('clinic.urgentAvailability.empty')}
          description={t('clinic.urgentAvailability.emptyHint')}
        />
      ) : (
        <div className="-mx-(--card-spacing)" data-testid="clinic-urgent-availability">
          <ul className="divide-y">
            {pageItems.map((d) => (
              <AvailableDoctorRow
                key={`${d.id}-${d.affiliated_branch.id}`}
                doctor={d}
                available={d.available_now}
                extra={
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {d.available_now && (
                      <Badge variant="success">{t('clinic.urgentAvailability.availableNow')}</Badge>
                    )}
                    <span className="truncate">{f.l(d.affiliated_branch)}</span>
                  </p>
                }
                aside={<Badge variant="muted">{t('clinic.urgentAvailability.notAvailable')}</Badge>}
              />
            ))}
          </ul>
          <Pager meta={meta} onPageChange={setPage} />
        </div>
      )}
    </Section>
  );
}
