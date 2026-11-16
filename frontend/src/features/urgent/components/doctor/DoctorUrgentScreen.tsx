'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { HeartHandshake, RefreshCw, Siren } from 'lucide-react';
import type { DoctorUrgentTab } from '../../types';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pagination } from '@/components/shared/Pagination';
import { UrgentRequestCard } from './UrgentRequestCard';
import { UrgentRequestSheet } from './UrgentRequestSheet';
import { CriticalRequestsAlert, sortBySeverity, useIncomingTitleBadge } from './severity';
import { URGENT_KEYS } from '../../hooks/keys';
import { urgentApi, volunteerApi } from '../../api';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const TABS: DoctorUrgentTab[] = ['open', 'accepted', 'closed'];
const POLL_MS = 10_000;

export function DoctorUrgentScreen() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DoctorUrgent />
    </Suspense>
  );
}

function DoctorUrgent() {
  const t = useT();
  const f = useFormat();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = (TABS.find((x) => x === searchParams.get('tab')) ?? 'open') as DoctorUrgentTab;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const [openId, setOpenId] = useState<string | null>(searchParams.get('request'));

  const go = (next: DoctorUrgentTab, p = 1) => {
    const qs = new URLSearchParams({ tab: next });
    if (p > 1) qs.set('page', String(p));
    router.replace(`${pathname}?${qs}`, { scroll: false });
  };

  // Open + accepted are always polled (they drive the tab counts); closed is fetched on demand.
  const pageOf = (x: DoctorUrgentTab) => (tab === x ? page : 1);
  const listQuery = (x: DoctorUrgentTab, poll: boolean) => ({
    queryKey: URGENT_KEYS.doctorList(x, pageOf(x)),
    queryFn: () => urgentApi.doctorList(x, pageOf(x)),
    refetchInterval: poll ? POLL_MS : (false as const),
    placeholderData: keepPreviousData,
  });
  const open = useQuery(listQuery('open', true));
  const accepted = useQuery(listQuery('accepted', true));
  const closed = useQuery({ ...listQuery('closed', false), enabled: tab === 'closed' });
  const volunteer = useQuery({ queryKey: URGENT_KEYS.volunteer, queryFn: volunteerApi.show });

  const list = tab === 'open' ? open : tab === 'accepted' ? accepted : closed;
  const openItems = open.data?.items ?? [];
  useIncomingTitleBadge(
    open.data?.pagination.total ?? 0,
    openItems.some((r) => r.severity === 'critical'),
  );
  const items = tab === 'open' ? sortBySeverity(list.data?.items ?? []) : (list.data?.items ?? []);
  const counts: Record<DoctorUrgentTab, number | undefined> = {
    open: open.data?.pagination.total,
    accepted: accepted.data?.pagination.total,
    closed: closed.data?.pagination.total,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('doctorUrgent.requests.title')}
        description={t('doctorUrgent.requests.description')}
        actions={
          <Button variant="outline" onClick={() => list.refetch()} disabled={list.isFetching}>
            <RefreshCw className={cn(list.isFetching && 'animate-spin')} aria-hidden />
            {t('doctorUrgent.requests.refresh')}
          </Button>
        }
      />

      {volunteer.data && (!volunteer.data.opted_in || !volunteer.data.available_now) && (
        <div
          className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p className="flex items-start gap-2 text-sm">
            <HeartHandshake className="mt-0.5 size-4 shrink-0" aria-hidden />
            {volunteer.data.opted_in
              ? t('doctorUrgent.requests.notAvailableBanner')
              : t('doctorUrgent.requests.notVolunteerBanner')}
          </p>
          <Link
            href="/dashboard/doctor/volunteer"
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'shrink-0 bg-card',
            })}
          >
            {t('doctorPanel.overview.manage')}
          </Link>
        </div>
      )}

      <CriticalRequestsAlert requests={openItems} onOpen={setOpenId} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onValueChange={(v) => go(v as DoctorUrgentTab)}
          className="w-full sm:w-auto"
        >
          <TabsList className="h-auto w-full group-data-horizontal/tabs:h-auto sm:w-auto">
            {TABS.map((x) => (
              <TabsTrigger
                key={x}
                value={x}
                className="min-h-10 flex-1 gap-2 px-3 sm:min-h-8 sm:flex-none"
              >
                {t(`doctorUrgent.requests.tabs.${x}`)}
                {counts[x] !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-xs tabular-nums',
                      x === 'open' && counts[x]! > 0
                        ? 'bg-red-500 text-white'
                        : 'bg-background text-muted-foreground',
                    )}
                    data-testid={`urgent-count-${x}`}
                  >
                    {f.number(counts[x]!)}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {tab !== 'closed' && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            {t('doctorUrgent.requests.autoRefresh')}
          </p>
        )}
      </div>

      <div role="tabpanel" aria-label={t(`doctorUrgent.requests.tabs.${tab}`)}>
        {list.isPending ? (
          <LoadingState rows={3} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState
            icon={Siren}
            title={t(`doctorUrgent.requests.empty.${tab}`)}
            description={tab === 'open' ? t('doctorUrgent.requests.emptyOpenHint') : undefined}
          />
        ) : (
          <>
            <div
              className={cn(
                'grid gap-4 xl:grid-cols-2',
                list.isFetching && list.isPlaceholderData && 'opacity-60',
              )}
            >
              {items.map((r) => (
                <UrgentRequestCard
                  key={r.id}
                  request={r}
                  fetchedAt={list.dataUpdatedAt}
                  onOpen={() => setOpenId(r.id)}
                />
              ))}
            </div>
            <Pagination meta={list.data.pagination} onPageChange={(p) => go(tab, p)} />
          </>
        )}
      </div>

      <UrgentRequestSheet id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
