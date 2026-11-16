'use client';

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, Plus, Stethoscope, Timer } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { RequireAuth } from '@/features/auth';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { PageHeader } from '@/components/shared/PageHeader';
import { buttonVariants } from '@/components/ui/button';
import { SeverityBadge, UrgentStatusBadge } from './badges';
import { isTerminal } from '../status';
import { URGENT_KEYS } from '../hooks/keys';
import { urgentApi } from '../api';
import { useElapsedFormat } from '@/lib/time';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

export function HistoryScreen() {
  return (
    <MainLayout>
      <RequireAuth>
        <UrgentHistory />
      </RequireAuth>
    </MainLayout>
  );
}

function UrgentHistory() {
  const t = useT();
  const f = useFormat();
  const duration = useElapsedFormat();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: URGENT_KEYS.patientList(page),
    queryFn: () => urgentApi.patientList(page),
    placeholderData: keepPreviousData,
  });

  const newRequest = (
    <Link href="/urgent" className={buttonVariants()}>
      <Plus aria-hidden />
      {t('urgent.history.newRequest')}
    </Link>
  );

  return (
    <div className="container-page max-w-3xl space-y-6 py-6 sm:py-10">
      <PageHeader
        title={t('urgent.history.title')}
        description={t('urgent.history.subtitle')}
        actions={newRequest}
      />

      {query.isPending ? (
        <LoadingState rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title={t('urgent.history.empty')}
          description={t('urgent.history.emptyBody')}
          action={newRequest}
        />
      ) : (
        <>
          <ul className={cn('grid gap-3', query.isPlaceholderData && 'opacity-60')}>
            {query.data.items.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/urgent/${r.id}`}
                  data-testid="urgent-history-item"
                  className={cn(
                    'flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30',
                    !isTerminal(r.status) && 'border-primary/40',
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {r.severity && <SeverityBadge severity={r.severity} />}
                      <UrgentStatusBadge status={r.status} />
                      <span className="text-sm text-muted-foreground">
                        {t(`consultation.${r.consultation_type}`)}
                      </span>
                      {r.specialty && (
                        <span className="text-sm text-muted-foreground">· {f.l(r.specialty)}</span>
                      )}
                      {r.preferred_doctor && (
                        <span className="text-sm text-muted-foreground">
                          · {t('urgent.history.directedTo', { name: r.preferred_doctor.name })}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm text-foreground">{r.description}</p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {r.created_at && <span>{f.dateTime(r.created_at)}</span>}
                      {r.time_to_accept_seconds != null && (
                        <span
                          className="inline-flex items-center gap-1"
                          data-testid="time-to-accept"
                        >
                          <Timer className="size-3.5" aria-hidden />
                          {t('urgent.history.acceptedIn', {
                            time: duration(r.time_to_accept_seconds),
                          })}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="hidden items-center gap-1 text-sm font-medium text-primary sm:flex">
                    {t('urgent.history.view')}
                    <ChevronLeft className="size-4 ltr:rotate-180" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination meta={query.data.pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
