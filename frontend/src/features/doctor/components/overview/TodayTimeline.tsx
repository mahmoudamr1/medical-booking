'use client';

import Link from 'next/link';
import { CalendarDays, ChevronRight, MapPin, Video } from 'lucide-react';
import type { Appointment } from '@/types/api';
import { Skeleton } from '@/components/shared/states';
import { StatusBadge, statusVariant } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { DoctorAppointmentActions } from '../DoctorAppointmentActions';
import { useNow } from '@/lib/time';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BUSINESS_TZ } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const RAIL: Record<ReturnType<typeof statusVariant>, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
  muted: 'bg-slate-300',
  danger: 'bg-red-500',
};

/** Today's appointments as a vertical timeline with "now"/"next" markers and quick actions. */
export function TodayTimeline({
  appointments,
  loading,
  onOpen,
}: {
  appointments: Appointment[];
  loading: boolean;
  onOpen: (id: string) => void;
}) {
  const t = useT();
  const f = useFormat();
  const now = useNow(60_000);
  const nextId = appointments.find(
    (a) =>
      new Date(a.ends_at).getTime() > now &&
      (a.status === 'confirmed' || a.status === 'pending_confirmation'),
  )?.id;

  return (
    <Card className="gap-0 py-0" data-testid="today-timeline">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">{t('doctorPanel.overview.timelineTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('doctorPanel.overview.timelineCount', { count: f.number(appointments.length) })}
          </p>
        </div>
        <Link
          href="/dashboard/doctor/calendar?view=day"
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          {t('doctorDash.nav.calendar')}
          <ChevronRight className="rtl:rotate-180" aria-hidden />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <EmptyState
          className="m-5"
          compact
          icon={CalendarDays}
          title={t('doctorPanel.overview.timelineEmpty')}
          description={t('doctorPanel.overview.timelineEmptyHint')}
        />
      ) : (
        <ol className="divide-y">
          {appointments.map((a) => {
            const tz = a.timezone ?? BUSINESS_TZ;
            const startMs = new Date(a.starts_at).getTime();
            const endMs = new Date(a.ends_at).getTime();
            const live = startMs <= now && endMs > now;
            const done = endMs <= now;
            return (
              <li
                key={a.id}
                className={cn(
                  'flex gap-3 px-4 py-3 sm:gap-4 sm:px-5',
                  a.id === nextId && 'bg-accent/40',
                )}
                data-testid="timeline-item"
              >
                <div className="w-14 shrink-0 pt-0.5 text-end sm:w-16">
                  <p
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      done && 'text-muted-foreground',
                    )}
                  >
                    {f.time(a.starts_at, tz)}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {f.time(a.ends_at, tz)}
                  </p>
                </div>
                <span
                  className={cn(
                    'w-1 shrink-0 rounded-full',
                    RAIL[statusVariant(a.status)],
                    done && 'opacity-50',
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onOpen(a.id)}
                      className="min-h-11 min-w-0 text-start sm:min-h-0"
                    >
                      <p className="truncate font-medium hover:text-primary">
                        {a.patient?.name ?? '—'}
                      </p>
                      <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                        {a.consultation_type === 'online' ? (
                          <Video className="size-3.5 shrink-0" aria-hidden />
                        ) : (
                          <MapPin className="size-3.5 shrink-0" aria-hidden />
                        )}
                        <span className="truncate">
                          {[
                            f.l(a.service),
                            a.consultation_type === 'online' ? t('common.online') : f.l(a.branch),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </p>
                    </button>
                    <div className="flex items-center gap-2">
                      {live && <Badge variant="info">{t('doctorPanel.overview.now')}</Badge>}
                      {a.id === nextId && !live && (
                        <Badge variant="outline">{t('doctorPanel.overview.next')}</Badge>
                      )}
                      <StatusBadge status={a.status} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => onOpen(a.id)}>
                      {t('appointments.view')}
                    </Button>
                    <DoctorAppointmentActions appointment={a} compact quickConfirm />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
