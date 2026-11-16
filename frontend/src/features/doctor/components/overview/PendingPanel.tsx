'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pager } from '@/components/shared/ClientPager';
import { DoctorAppointmentActions } from '../DoctorAppointmentActions';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { doctorApi } from '../../api';
import { addDaysToKey, todayKey, zonedDayStartIso, BUSINESS_TZ } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { doctorKeys } from '../../hooks/keys';

const PAGE_SIZE = 5;
/** Requests for the next 60 days (the API allows ranges up to 62 days). */
const HORIZON_DAYS = 60;

/** Booking requests awaiting confirmation, paged, with one-click confirm and reject-with-reason. */
export function PendingPanel({ total, onOpen }: { total?: number; onOpen: (id: string) => void }) {
  const t = useT();
  const f = useFormat();
  const [page, setPage] = useState(1);
  const today = todayKey(BUSINESS_TZ);
  const query = useQuery({
    queryKey: doctorKeys.pending(today, page),
    queryFn: () =>
      doctorApi.appointments({
        from: zonedDayStartIso(today, BUSINESS_TZ),
        to: zonedDayStartIso(addDaysToKey(today, HORIZON_DAYS), BUSINESS_TZ),
        status: 'pending_confirmation',
        page,
        per_page: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <Card className="gap-0 py-0" data-testid="pending-panel">
      <div className="flex items-center justify-between gap-2 border-b px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">{t('doctorDash.pendingTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('doctorPanel.overview.pendingHint')}</p>
        </div>
        {!!total && <Badge variant="warning">{f.number(total)}</Badge>}
      </div>
      {query.isPending ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState className="m-4" error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          className="m-4"
          compact
          tone="muted"
          icon={CheckCircle2}
          title={t('doctorPanel.overview.pendingEmpty')}
        />
      ) : (
        <>
          <ul className={cn('divide-y', query.isPlaceholderData && 'opacity-60')}>
            {query.data.items.map((a) => (
              <li
                key={a.id}
                className="space-y-2 px-5 py-3"
                data-testid="pending-item"
                data-reference={a.reference}
              >
                <button
                  type="button"
                  onClick={() => onOpen(a.id)}
                  className="block min-h-11 w-full min-w-0 text-start sm:min-h-0"
                >
                  <p className="truncate font-medium hover:text-primary">
                    {a.patient?.name ?? '—'}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {f.dateTime(a.starts_at, a.timezone ?? BUSINESS_TZ)} ·{' '}
                    {f.l(a.service) || t(`consultation.${a.consultation_type}`)}
                  </p>
                </button>
                <div className="flex flex-wrap gap-2">
                  <DoctorAppointmentActions
                    appointment={a}
                    compact
                    quickConfirm
                    only={['confirm', 'reject']}
                  />
                </div>
              </li>
            ))}
          </ul>
          <Pager meta={query.data.pagination} onPageChange={setPage} />
        </>
      )}
    </Card>
  );
}
