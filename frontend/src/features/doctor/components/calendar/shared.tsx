'use client';

import type { CSSProperties } from 'react';
import type { Appointment } from '@/types/api';
import type { ScheduleException, ScheduleWindow } from '../../types';
import type { DayHours } from './workingHours';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

/** Props shared by the day/week/month calendar views. */
export interface CalendarViewProps {
  byDay: Map<string, Appointment[]>;
  schedules: ScheduleWindow[];
  exceptions: ScheduleException[];
  today: string;
  onOpen: (id: string) => void;
  onDay: (key: string) => void;
}

export const BREAK_STYLE: CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(135deg, rgb(148 163 184 / 0.22) 0 6px, transparent 6px 12px)',
};
export const CLOSED_STYLE: CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(135deg, rgb(239 68 68 / 0.12) 0 8px, transparent 8px 16px)',
};

export function CalendarLegend() {
  const t = useT();
  const items: [string, string, CSSProperties?][] = [
    ['bg-emerald-50 ring-emerald-200', t('doctorPanel.calendar.legendWorking')],
    ['bg-slate-50 ring-slate-200', t('doctorPanel.calendar.legendBreak'), BREAK_STYLE],
    ['bg-amber-50 ring-amber-200', t('doctorPanel.calendar.legendCustom')],
    ['bg-red-50 ring-red-200', t('doctorPanel.calendar.legendClosed'), CLOSED_STYLE],
    ['bg-muted ring-border', t('doctorPanel.calendar.legendOff')],
  ];
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
      data-testid="calendar-legend"
    >
      {items.map(([cls, label, style]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span
            className={cn('size-3 rounded-sm ring-1 ring-inset', cls)}
            style={style}
            aria-hidden
          />
          {label}
        </span>
      ))}
    </div>
  );
}

/** Working-hours chips for one day ("09:00–17:00", Closed, Day off). */
export function HoursSummary({ hours }: { hours: DayHours }) {
  const t = useT();
  if (hours.closed) return <Badge variant="danger">{t('doctorPanel.calendar.closedDay')}</Badge>;
  if (hours.windows.length === 0) return <Badge variant="muted">{t('doctorDash.dayOff')}</Badge>;
  return (
    <span className="flex flex-wrap gap-1">
      {hours.windows.map((w, i) => (
        <Badge key={i} variant={hours.custom ? 'warning' : 'success'} className="tabular-nums">
          <span dir="ltr">
            {w.starts_at}–{w.ends_at}
          </span>
        </Badge>
      ))}
    </span>
  );
}
