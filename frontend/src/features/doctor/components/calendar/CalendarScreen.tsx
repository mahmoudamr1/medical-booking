'use client';

import { Suspense, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import type { Appointment } from '@/types/api';
import type { ScheduleException, ScheduleWindow } from '../../types';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { DoctorAppointmentSheet } from '../DoctorAppointmentActions';
import { CalendarLegend } from './shared';
import { ACTIVE_STATUSES, CalendarToolbar, VIEWS, type View } from './CalendarToolbar';
import { MonthGrid } from './MonthGrid';
import { TimeGrid } from './TimeGrid';
import { WeekAgenda } from './WeekAgenda';
import { doctorApi } from '../../api';
import { doctorKeys } from '../../hooks/keys';
import {
  addDaysToKey,
  addMonthsToKey,
  dateKeyInTz,
  daysInMonth,
  rangeKeys,
  startOfMonthKey,
  startOfWeekKey,
  todayKey,
  zonedDayStartIso,
  BUSINESS_TZ,
} from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

/** The API caps a page at 500; a calendar range (≤ 1 month) for one doctor stays well below it. */
const PER_PAGE = 500;

function rangeFor(view: View, anchor: string): { start: string; days: number } {
  if (view === 'day') return { start: anchor, days: 1 };
  if (view === 'week') return { start: startOfWeekKey(anchor), days: 7 };
  const start = startOfMonthKey(anchor);
  return { start, days: daysInMonth(start) };
}

export function CalendarScreen() {
  return (
    <Suspense fallback={<Skeleton className="h-[480px] w-full rounded-xl" />}>
      <DoctorCalendar />
    </Suspense>
  );
}

function DoctorCalendar() {
  const t = useT();
  const f = useFormat();
  const tz = BUSINESS_TZ;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = (VIEWS.find((v) => v === params.get('view')) ?? 'week') as View;
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') ?? '')
    ? params.get('date')!
    : todayKey(tz);
  const [status, setStatus] = useState(ACTIVE_STATUSES);
  const [openId, setOpenId] = useState<string | null>(null);
  const today = todayKey(tz);

  const go = (next: { view?: View; date?: string }) => {
    const qs = new URLSearchParams({ view: next.view ?? view, date: next.date ?? anchor });
    router.replace(`${pathname}?${qs}`, { scroll: false });
  };

  const { start, days } = rangeFor(view, anchor);
  const end = addDaysToKey(start, days);

  const query = useQuery({
    queryKey: doctorKeys.calendar(start, end, status),
    queryFn: () =>
      doctorApi.appointments({
        from: zonedDayStartIso(start, tz),
        to: zonedDayStartIso(end, tz),
        status: status || undefined,
      }),
    placeholderData: keepPreviousData,
  });
  const schedules = useQuery({
    queryKey: doctorKeys.schedules,
    queryFn: doctorApi.schedules,
    staleTime: 60_000,
  });
  const exceptions = useQuery({
    queryKey: doctorKeys.exceptions,
    queryFn: doctorApi.exceptions,
    staleTime: 60_000,
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of query.data?.items ?? []) {
      const key = dateKeyInTz(a.starts_at, a.timezone ?? tz);
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return map;
  }, [query.data, tz]);

  const shift = (dir: 1 | -1) => {
    if (view === 'day') go({ date: addDaysToKey(anchor, dir) });
    else if (view === 'week') go({ date: addDaysToKey(anchor, 7 * dir) });
    else go({ date: addMonthsToKey(anchor, dir) });
  };
  const openDay = (key: string) => go({ view: 'day', date: key });

  const title =
    view === 'day'
      ? f.dateKey(anchor, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : view === 'week'
        ? `${f.dateKey(start, { day: 'numeric', month: 'short' })} – ${f.dateKey(addDaysToKey(start, 6), { day: 'numeric', month: 'short', year: 'numeric' })}`
        : f.dateKey(start, { month: 'long', year: 'numeric' });

  const scheduleData: ScheduleWindow[] = schedules.data ?? [];
  const exceptionData: ScheduleException[] = exceptions.data ?? [];
  const total = query.data?.pagination.total ?? 0;
  const keys = rangeKeys(start, days);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('doctorDash.calendarTitle')}
        description={t('doctorPanel.calendar.subtitle')}
      />

      <CalendarToolbar
        title={title}
        view={view}
        status={status}
        fetching={query.isFetching && !query.isPending}
        onShift={shift}
        onToday={() => go({ date: today })}
        onView={(v) => go({ view: v })}
        onStatus={setStatus}
      />

      <CalendarLegend />

      {query.isPending ? (
        <Skeleton className="h-[480px] w-full rounded-xl" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <div
          className={cn('space-y-3 transition-opacity', query.isFetching && 'opacity-70')}
          data-testid={`calendar-${view}`}
        >
          {total > PER_PAGE && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t('doctorPanel.calendar.rangeTruncated', { count: f.number(PER_PAGE) })}
            </p>
          )}
          {view === 'day' && (
            <TimeGrid
              days={[anchor]}
              byDay={byDay}
              schedules={scheduleData}
              exceptions={exceptionData}
              today={today}
              onOpen={setOpenId}
              onDay={openDay}
            />
          )}
          {view === 'week' && (
            <>
              <div className="hidden md:block">
                <TimeGrid
                  days={keys}
                  byDay={byDay}
                  schedules={scheduleData}
                  exceptions={exceptionData}
                  today={today}
                  onOpen={setOpenId}
                  onDay={openDay}
                />
              </div>
              <div className="md:hidden">
                <WeekAgenda
                  days={keys}
                  byDay={byDay}
                  schedules={scheduleData}
                  exceptions={exceptionData}
                  today={today}
                  onOpen={setOpenId}
                  onDay={openDay}
                />
              </div>
            </>
          )}
          {view === 'month' && (
            <MonthGrid
              start={start}
              days={days}
              byDay={byDay}
              schedules={scheduleData}
              exceptions={exceptionData}
              today={today}
              onOpen={setOpenId}
              onDay={openDay}
            />
          )}
          {total === 0 && view !== 'week' && (
            <EmptyState icon={CalendarDays} title={t('doctorDash.noAppointments')} compact />
          )}
        </div>
      )}

      <DoctorAppointmentSheet appointmentId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
