'use client';

import { statusTone } from '@/components/shared/StatusBadge';
import { CLOSED_STYLE, type CalendarViewProps } from './shared';
import { hoursForDate } from './workingHours';
import { dayOfWeekOfKey, rangeKeys, BUSINESS_TZ } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const WEEKDAYS = [6, 0, 1, 2, 3, 4, 5]; // weeks start on Saturday

/** Month grid: cells shaded by working hours; chips on tablets/desktop, counts on phones. */
export function MonthGrid({
  start,
  days,
  byDay,
  schedules,
  exceptions,
  today,
  onOpen,
  onDay,
}: CalendarViewProps & { start: string; days: number }) {
  const t = useT();
  const f = useFormat();
  const lead = (dayOfWeekOfKey(start) - 6 + 7) % 7;

  return (
    <div className="overflow-hidden rounded-xl border bg-card" data-testid="month-grid">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">
            {f.weekday(d, 'short')}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: lead }, (_, i) => (
          <div key={`lead-${i}`} className="border-e border-b bg-muted/20" />
        ))}
        {rangeKeys(start, days).map((key) => {
          const items = byDay.get(key) ?? [];
          const h = hoursForDate(key, schedules, exceptions);
          const shade = h.closed
            ? 'bg-red-50/60'
            : h.custom
              ? 'bg-amber-50/70'
              : h.windows.length
                ? 'bg-emerald-50/40'
                : 'bg-muted/50';
          return (
            <div
              key={key}
              className={cn(
                'relative min-h-16 min-w-0 border-e border-b p-1 sm:min-h-28 sm:p-1.5',
                shade,
              )}
              style={h.closed ? CLOSED_STYLE : undefined}
              data-day={key}
            >
              {/* On phones the whole cell opens the day (chips are hidden there). */}
              <button
                type="button"
                className="absolute inset-0 sm:hidden"
                onClick={() => onDay(key)}
                aria-label={`${f.dateKey(key)} · ${t('doctorPanel.calendar.appointmentsCount', { count: f.number(items.length) })}`}
              />
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => onDay(key)}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums hover:bg-muted',
                    key === today && 'bg-primary text-primary-foreground hover:bg-primary/90',
                  )}
                >
                  {f.dateKey(key, { day: 'numeric' })}
                </button>
                {items.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary tabular-nums sm:hidden">
                    {f.number(items.length)}
                  </span>
                )}
              </div>
              <div className="mt-1 hidden space-y-1 sm:block">
                {items.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onOpen(a.id)}
                    className={cn(
                      'block w-full truncate rounded px-1.5 py-0.5 text-start text-[11px] ring-1 ring-inset',
                      statusTone(a.status),
                    )}
                    title={`${a.patient?.name ?? ''} — ${a.reference}`}
                    data-testid="calendar-appointment"
                  >
                    <span className="font-semibold tabular-nums">
                      {f.time(a.starts_at, a.timezone ?? BUSINESS_TZ)}
                    </span>{' '}
                    {a.patient?.name}
                  </button>
                ))}
                {items.length > 3 && (
                  <button
                    type="button"
                    onClick={() => onDay(key)}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    {t('doctorDash.moreCount', { count: f.number(items.length - 3) })}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
