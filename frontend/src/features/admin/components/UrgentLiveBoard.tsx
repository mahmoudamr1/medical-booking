'use client';

import { useQuery } from '@tanstack/react-query';
import { Flag, Hourglass, Siren, Stethoscope, Timer, UserRoundX } from 'lucide-react';
import { useDurationFormat } from '@/lib/time';
import { SeverityBadge, AvailableDoctorRow, URGENT_KEYS, urgentApi } from '@/features/urgent';
import { Pager, useClientPage } from '@/components/shared/ClientPager';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatCard } from '@/components/shared/StatCard';
import { ErrorState, Section, Skeleton } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { AdminLiveUrgentRequest, AvailableDoctor, UrgentSeverity } from '@/features/urgent';

const POLL_MS = 10_000;

/** Seconds as "47 s" under a minute, else the shared "2 h 5 min" style. */
function useSeconds() {
  const t = useT();
  const f = useFormat();
  const duration = useDurationFormat();
  return (s: number | null | undefined) =>
    s === null || s === undefined
      ? t('admin.urgent.live.none')
      : s < 60
        ? t('admin.urgent.live.seconds', { n: f.number(s, 0) })
        : duration(s * 1000);
}

/**
 * Admin live board (GET /admin/urgent/live, polled every 10 s): headline numbers, the doctors available
 * right now and the open requests (critical highlighted). `onOpen` opens a request's detail sheet.
 */
export function UrgentLiveBoard({ onOpen }: { onOpen: (id: string) => void }) {
  const t = useT();
  const f = useFormat();
  const secs = useSeconds();
  const live = useQuery({
    queryKey: URGENT_KEYS.adminLive,
    queryFn: urgentApi.adminLive,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });

  if (live.isPending) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (live.isError)
    return (
      <ErrorState
        error={live.error}
        onRetry={() => live.refetch()}
        title={t('admin.urgent.live.title')}
      />
    );
  const d = live.data;
  const openTotal = d.open.critical + d.open.urgent + d.open.standard;

  return (
    <section
      aria-labelledby="live-board-title"
      className="space-y-4"
      data-testid="urgent-live-board"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="live-board-title" className="flex items-center gap-2 text-lg font-semibold">
          <span className="relative flex size-2.5" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          {t('admin.urgent.live.title')}
        </h2>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {t('admin.urgent.live.subtitle')} ·{' '}
          {t('admin.urgent.live.updated', { time: f.time(new Date(live.dataUpdatedAt)) })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label={t('admin.urgent.live.availableNow')}
          value={f.number(d.available_doctors)}
          icon={Stethoscope}
          tone="success"
        />
        <StatCard
          label={t('admin.urgent.live.open')}
          value={f.number(openTotal)}
          icon={Siren}
          tone={d.open.critical > 0 ? 'danger' : openTotal > 0 ? 'warning' : 'muted'}
          hint={<SeverityCounts open={d.open} />}
        />
        <StatCard
          label={t('admin.urgent.live.oldestWaiting')}
          value={secs(d.oldest_waiting_seconds)}
          icon={Hourglass}
          tone="warning"
        />
        <StatCard
          label={t('admin.urgent.live.avgAccept')}
          value={secs(d.avg_time_to_accept_seconds_today)}
          icon={Timer}
          tone="info"
        />
        <StatCard
          label={t('admin.urgent.live.unmatched')}
          value={f.number(d.unmatched_last_24h)}
          icon={UserRoundX}
          tone={d.unmatched_last_24h > 0 ? 'danger' : 'muted'}
        />
        <StatCard
          label={t('admin.urgent.live.flaggedOpen')}
          value={f.number(d.flagged_open)}
          icon={Flag}
          tone={d.flagged_open > 0 ? 'danger' : 'muted'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title={t('admin.urgent.live.requestsTitle')} className="gap-3">
          <OpenRequests items={d.open_requests} onOpen={onOpen} />
        </Section>
        <Section title={t('admin.urgent.live.doctorsTitle')} className="gap-3">
          <AvailableDoctors items={d.doctors} />
        </Section>
      </div>
    </section>
  );
}

function SeverityCounts({ open }: { open: Record<UrgentSeverity, number> }) {
  const t = useT();
  const f = useFormat();
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {(['critical', 'urgent', 'standard'] as const).map((s) => (
        <span
          key={s}
          className={cn(
            'inline-flex items-center gap-1 tabular-nums',
            s === 'critical' && open.critical > 0 && 'font-semibold text-red-700',
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              s === 'critical' ? 'bg-red-500' : s === 'urgent' ? 'bg-amber-500' : 'bg-slate-400',
            )}
            aria-hidden
          />
          <span className="sr-only">{t(`urgent.severity.${s}`)}</span>
          {f.number(open[s])}
        </span>
      ))}
    </span>
  );
}

function OpenRequests({
  items,
  onOpen,
}: {
  items: AdminLiveUrgentRequest[];
  onOpen: (id: string) => void;
}) {
  const t = useT();
  const f = useFormat();
  const secs = useSeconds();
  const { pageItems, meta, setPage } = useClientPage(items, 6);
  if (items.length === 0)
    return (
      <EmptyState compact icon={Siren} tone="muted" title={t('admin.urgent.live.noRequests')} />
    );
  return (
    <div className="-mx-(--card-spacing)">
      <ul className="divide-y">
        {pageItems.map((r) => (
          <li
            key={r.id}
            data-severity={r.severity}
            className={cn(
              'flex flex-wrap items-center gap-3 px-(--card-spacing) py-3',
              r.severity === 'critical' && 'border-s-4 border-s-red-500 bg-red-50/60',
            )}
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={r.severity} />
                <span className="truncate text-sm font-medium">
                  {r.specialty ? f.l(r.specialty) : '—'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {[
                  r.governorate && f.l(r.governorate),
                  r.waiting_seconds !== undefined &&
                    t('admin.urgent.live.waiting', { duration: secs(r.waiting_seconds) }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
                {r.preferred_doctor &&
                  ` · ${t('admin.urgent.live.directedTo', { name: r.preferred_doctor.name })}`}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onOpen(r.id)}>
              {t('admin.urgent.live.view')}
            </Button>
          </li>
        ))}
      </ul>
      <Pager meta={meta} onPageChange={setPage} />
    </div>
  );
}

function AvailableDoctors({ items }: { items: AvailableDoctor[] }) {
  const t = useT();
  const { pageItems, meta, setPage } = useClientPage(items, 6);
  if (items.length === 0)
    return (
      <EmptyState
        compact
        icon={Stethoscope}
        tone="muted"
        title={t('admin.urgent.live.noDoctors')}
      />
    );
  return (
    <div className="-mx-(--card-spacing)">
      <ul className="divide-y">
        {pageItems.map((doc) => (
          <AvailableDoctorRow key={doc.id} doctor={doc} />
        ))}
      </ul>
      <Pager meta={meta} onPageChange={setPage} />
    </div>
  );
}
