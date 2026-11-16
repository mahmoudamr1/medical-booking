'use client';

import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/form';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '@/i18n/provider';

export type View = 'day' | 'week' | 'month';
export const VIEWS: View[] = ['day', 'week', 'month'];

export const ACTIVE_STATUSES = 'pending_confirmation,confirmed,completed,no_show';
const STATUS_FILTERS = [
  [ACTIVE_STATUSES, 'doctorPanel.calendar.active'],
  ['', 'common.all'],
  ['pending_confirmation', 'status.pending_confirmation'],
  ['confirmed', 'status.confirmed'],
  ['completed', 'status.completed'],
  [
    'cancelled_by_patient,cancelled_by_doctor,cancelled_by_clinic,cancelled_by_admin,rejected,expired',
    'groups.cancelled',
  ],
  ['no_show', 'status.no_show'],
] as const;

/** Previous / today / next, the period title, a status filter and the day/week/month switch. */
export function CalendarToolbar({
  title,
  view,
  status,
  fetching,
  onShift,
  onToday,
  onView,
  onStatus,
}: {
  title: string;
  view: View;
  status: string;
  fetching: boolean;
  onShift: (dir: 1 | -1) => void;
  onToday: () => void;
  onView: (view: View) => void;
  onStatus: (status: string) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onShift(-1)}
            aria-label={t('common.previous')}
          >
            <ChevronLeft className="rtl:rotate-180" />
          </Button>
          <Button variant="outline" size="sm" onClick={onToday}>
            {t('common.today')}
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onShift(1)}
            aria-label={t('common.next')}
          >
            <ChevronRight className="rtl:rotate-180" />
          </Button>
        </div>
        <h2
          className="min-w-0 truncate text-base font-semibold sm:text-lg"
          data-testid="calendar-title"
          aria-live="polite"
        >
          {title}
        </h2>
        {fetching && (
          <RefreshCw className="size-4 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect
          aria-label={t('doctorDash.statusFilter')}
          className="w-full sm:w-48"
          selectClassName="sm:h-9"
          value={status}
          onChange={(e) => onStatus(e.target.value)}
        >
          {STATUS_FILTERS.map(([value, key]) => (
            <option key={key} value={value}>
              {t(key)}
            </option>
          ))}
        </NativeSelect>
        <Tabs value={view} onValueChange={(v) => onView(v as View)} className="w-full sm:w-auto">
          <TabsList className="h-auto w-full group-data-horizontal/tabs:h-auto sm:w-auto">
            {VIEWS.map((v) => (
              <TabsTrigger
                key={v}
                value={v}
                className="min-h-10 flex-1 px-4 sm:min-h-8 sm:flex-none"
              >
                {t(
                  v === 'day'
                    ? 'doctorDash.viewDay'
                    : v === 'week'
                      ? 'doctorDash.viewWeek'
                      : 'doctorDash.viewMonth',
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
