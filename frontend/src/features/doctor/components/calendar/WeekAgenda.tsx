'use client';

import { StatusBadge } from '@/components/shared/StatusBadge';
import { HoursSummary, type CalendarViewProps } from './shared';
import { hoursForDate } from './workingHours';
import { BUSINESS_TZ } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

/** Week as a stacked list of days (phones), each with its working hours and appointments. */
export function WeekAgenda({
  days,
  byDay,
  schedules,
  exceptions,
  today,
  onOpen,
  onDay,
}: CalendarViewProps & { days: string[] }) {
  const t = useT();
  const f = useFormat();
  return (
    <ul className="space-y-3" data-testid="week-agenda">
      {days.map((k) => {
        const h = hoursForDate(k, schedules, exceptions);
        const items = byDay.get(k) ?? [];
        return (
          <li
            key={k}
            className={cn(
              'overflow-hidden rounded-xl border bg-card',
              k === today && 'ring-2 ring-primary/60',
            )}
          >
            <div
              className={cn(
                'flex flex-wrap items-center justify-between gap-2 px-4 py-1',
                h.closed ? 'bg-red-50/70' : h.windows.length ? 'bg-emerald-50/60' : 'bg-muted/60',
              )}
            >
              <button
                type="button"
                onClick={() => onDay(k)}
                className="min-h-11 text-start font-semibold hover:text-primary"
              >
                {f.dateKey(k, { weekday: 'long', day: 'numeric', month: 'short' })}
              </button>
              <HoursSummary hours={h} />
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                {t('doctorPanel.calendar.noneThisDay')}
              </p>
            ) : (
              <ul className="divide-y">
                {items.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(a.id)}
                      className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-start hover:bg-muted/50"
                      data-testid="calendar-appointment"
                    >
                      <span className="w-20 shrink-0 text-sm font-semibold whitespace-nowrap tabular-nums">
                        {f.time(a.starts_at, a.timezone ?? BUSINESS_TZ)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {a.patient?.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {f.l(a.service)}
                        </span>
                      </span>
                      <StatusBadge status={a.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
