'use client';

import type { Appointment } from '@/types/api';
import { statusTone } from '@/components/shared/StatusBadge';
import { useNow } from '@/lib/time';
import { BREAK_STYLE, CLOSED_STYLE, HoursSummary, type CalendarViewProps } from './shared';
import { hhmmToMinutes, hoursForDate, layoutLanes, type DayHours } from './workingHours';
import { dateKeyInTz, minutesOfDayInTz, BUSINESS_TZ } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const startMin = (a: Appointment) => minutesOfDayInTz(a.starts_at, a.timezone ?? BUSINESS_TZ);

/** Visible hour range: union of working windows and appointments, at least 08:00–18:00. */
function hourRange(
  days: string[],
  hours: Map<string, DayHours>,
  byDay: Map<string, Appointment[]>,
): [number, number] {
  let min = 8 * 60;
  let max = 18 * 60;
  for (const k of days) {
    for (const w of hours.get(k)!.windows) {
      min = Math.min(min, hhmmToMinutes(w.starts_at));
      max = Math.max(max, hhmmToMinutes(w.ends_at));
    }
    for (const a of byDay.get(k) ?? []) {
      min = Math.min(min, startMin(a));
      max = Math.max(max, Math.min(24 * 60, startMin(a) + a.duration_minutes));
    }
  }
  return [Math.max(0, Math.floor(min / 60)), Math.min(24, Math.ceil(max / 60))];
}

/** Day/week time grid: working hours shaded, breaks striped, closed days hatched, appointments in lanes. */
export function TimeGrid({
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
  const now = useNow(60_000);
  const single = days.length === 1;
  const hourPx = single ? 64 : 52;
  const hoursByDay = new Map(days.map((k) => [k, hoursForDate(k, schedules, exceptions)]));
  const [startHour, endHour] = hourRange(days, hoursByDay, byDay);
  const top = (m: number) => ((m - startHour * 60) / 60) * hourPx;
  const span = (from: string, to: string) => ({
    top: top(hhmmToMinutes(from)),
    height: top(hhmmToMinutes(to)) - top(hhmmToMinutes(from)),
  });
  const height = (endHour - startHour) * hourPx;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const nowKey = dateKeyInTz(new Date(now), BUSINESS_TZ);
  const nowMin = minutesOfDayInTz(new Date(now), BUSINESS_TZ);
  const cols = `3.25rem repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="overflow-hidden rounded-xl border bg-card" data-testid="time-grid">
      <div className="grid border-b bg-muted/30" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map((k) => {
          const h = hoursByDay.get(k)!;
          const count = f.number((byDay.get(k) ?? []).length);
          return (
            <div
              key={k}
              className={cn(
                'min-w-0 border-s px-2 py-2',
                single && 'flex flex-wrap items-center justify-between gap-2 px-3',
              )}
            >
              <button
                type="button"
                onClick={() => onDay(k)}
                className={cn(
                  'flex min-h-10 w-full min-w-0 flex-col items-center justify-center rounded-md text-sm hover:bg-muted sm:min-h-0',
                  single && 'w-auto items-start px-1',
                )}
              >
                <span className="text-xs text-muted-foreground">
                  {f.dateKey(k, { weekday: single ? 'long' : 'short' })}
                </span>
                <span
                  className={cn(
                    'text-base font-semibold tabular-nums',
                    k === today &&
                      'flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground',
                  )}
                >
                  {f.dateKey(k, { day: 'numeric' })}
                </span>
              </button>
              {single ? (
                <span className="flex flex-wrap items-center gap-2">
                  <HoursSummary hours={h} />
                  <span className="text-xs text-muted-foreground">
                    {t('doctorPanel.calendar.appointmentsCount', { count })}
                  </span>
                </span>
              ) : (
                <p className="mt-1 truncate text-center text-[11px] text-muted-foreground">
                  {h.closed
                    ? t('doctorPanel.calendar.closedDay')
                    : h.windows.length === 0
                      ? t('doctorDash.dayOff')
                      : t('doctorPanel.calendar.appointmentsCount', { count })}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: cols }}>
          <div className="relative" style={{ height }}>
            {hours.slice(1).map((h) => (
              <span
                key={h}
                className="absolute end-1.5 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums"
                style={{ top: top(h * 60) }}
                dir="ltr"
              >
                {`${String(h).padStart(2, '0')}:00`}
              </span>
            ))}
          </div>
          {days.map((k) => {
            const h = hoursByDay.get(k)!;
            const items = (byDay.get(k) ?? []).map((a) => ({
              id: a.id,
              a,
              start: startMin(a),
              end: Math.min(endHour * 60, startMin(a) + Math.max(a.duration_minutes, 15)),
            }));
            const lanes = layoutLanes(items);
            return (
              <div
                key={k}
                className={cn('relative border-s', h.closed ? 'bg-red-50/40' : 'bg-muted/50')}
                style={{ height, ...(h.closed ? CLOSED_STYLE : {}) }}
                data-day={k}
              >
                {hours.map((hr) => (
                  <span
                    key={hr}
                    className="pointer-events-none absolute inset-x-0 border-t border-border/70"
                    style={{ top: top(hr * 60) }}
                    aria-hidden
                  />
                ))}
                {h.windows.map((w, i) => (
                  <div
                    key={i}
                    className={cn(
                      'absolute inset-x-0 border-s-2',
                      h.custom
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-emerald-400 bg-emerald-50/80',
                    )}
                    style={span(w.starts_at, w.ends_at)}
                    data-testid="working-window"
                    aria-hidden
                  >
                    {w.breaks.map((b, j) => {
                      const s = span(b.starts_at, b.ends_at);
                      return (
                        <div
                          key={j}
                          className="absolute inset-x-0 bg-slate-50"
                          style={{
                            ...BREAK_STYLE,
                            top: s.top - top(hhmmToMinutes(w.starts_at)),
                            height: s.height,
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
                {h.closed && (
                  <span className="absolute inset-x-1 top-2 rounded bg-red-100/90 px-1.5 py-0.5 text-center text-[11px] font-medium text-red-700">
                    {[t('doctorPanel.calendar.closedDay'), h.exception?.reason]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
                {k === nowKey && nowMin >= startHour * 60 && nowMin <= endHour * 60 && (
                  <span
                    className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500"
                    style={{ top: top(nowMin) }}
                    aria-hidden
                  />
                )}
                {items.map(({ id, a, start, end }) => {
                  const l = lanes.get(id) ?? { lane: 0, lanes: 1 };
                  const blockH = Math.max(top(end) - top(start) - 2, 20);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onOpen(id)}
                      title={`${f.time(a.starts_at, a.timezone ?? BUSINESS_TZ)} · ${a.patient?.name ?? ''} · ${a.reference}`}
                      className={cn(
                        'absolute z-[5] overflow-hidden rounded-md px-1.5 py-0.5 text-start text-[11px] leading-tight shadow-sm ring-1 transition ring-inset hover:z-20 hover:shadow-md focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring',
                        statusTone(a.status),
                      )}
                      style={{
                        top: top(start) + 1,
                        height: blockH,
                        insetInlineStart: `calc(${(l.lane * 100) / l.lanes}% + 2px)`,
                        width: `calc(${100 / l.lanes}% - 4px)`,
                      }}
                      data-testid="calendar-appointment"
                      data-status={a.status}
                    >
                      <span className="font-semibold tabular-nums">
                        {f.time(a.starts_at, a.timezone ?? BUSINESS_TZ)}
                      </span>{' '}
                      <span className={cn(blockH > 34 && 'block truncate')}>{a.patient?.name}</span>
                      {single && blockH > 48 && (
                        <span className="block truncate opacity-80">{f.l(a.service)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
