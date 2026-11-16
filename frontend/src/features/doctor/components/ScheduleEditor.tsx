'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Branch } from '@/types/api';
import type { ScheduleWindow } from '../types';
import { StickySaveBar } from '@/components/shared/StickySaveBar';
import { ScheduleWindowRow } from './ScheduleWindowRow';
import { hhmmToMinutes } from './calendar/workingHours';
import { Button } from '@/components/ui/button';
import { doctorApi } from '../api';
import { isApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { doctorKeys } from '../hooks/keys';

const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5]; // Saturday first

interface Row extends ScheduleWindow {
  uid: string;
}

let uidCounter = 0;
const nextUid = () => `w${++uidCounter}`;

/** Canonical JSON of a schedule (order-independent) for dirty checks. */
function canonical(list: ScheduleWindow[]): string {
  return JSON.stringify(
    list
      .map(({ clinic_branch_id, day_of_week, starts_at, ends_at, breaks }) => ({
        clinic_branch_id,
        day_of_week,
        starts_at,
        ends_at,
        breaks,
      }))
      .sort((a, b) => a.day_of_week - b.day_of_week || a.starts_at.localeCompare(b.starts_at)),
  );
}

/** Weekly windows per day with breaks, a dirty-aware sticky save bar and server error mapping. */
export function ScheduleEditor({
  initial,
  branches,
}: {
  initial: ScheduleWindow[];
  branches: Branch[];
}) {
  const t = useT();
  const f = useFormat();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>(() => initial.map((w) => ({ ...w, uid: nextUid() })));
  const [saved, setSaved] = useState<ScheduleWindow[]>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = canonical(rows) !== canonical(saved);

  // Payload order = rows sorted by day/time (so server error indexes map back to rows).
  const rowsForPayload = [...rows].sort(
    (a, b) =>
      WEEK_ORDER.indexOf(a.day_of_week) - WEEK_ORDER.indexOf(b.day_of_week) ||
      a.starts_at.localeCompare(b.starts_at),
  );

  const save = useMutation({
    mutationFn: (payload: ScheduleWindow[]) => doctorApi.saveSchedules(payload),
    onSuccess: ({ data, message }) => {
      queryClient.setQueryData(doctorKeys.schedules, data);
      queryClient.invalidateQueries({ queryKey: doctorKeys.dashboard });
      setRows(data.map((w) => ({ ...w, uid: nextUid() })));
      setSaved(data);
      setErrors({});
      toast.success(message || t('common.saved'));
    },
    onError: (e) => {
      if (isApiError(e) && e.errors) {
        // Laravel keys look like "schedules.3.starts_at" / "schedules.3.breaks.0": map to the row uid.
        const mapped: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(e.errors)) {
          const m = key.match(/^schedules\.(\d+)/);
          const row = m ? rowsForPayload[Number(m[1])] : undefined;
          if (row) mapped[row.uid] = msgs[0];
        }
        setErrors(mapped);
      }
      toast.error(errorMessage(e, t));
    },
  });

  const update = (uid: string, patch: Partial<ScheduleWindow>) =>
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  const remove = (uid: string) => setRows((rs) => rs.filter((r) => r.uid !== uid));
  const add = (day: number) =>
    setRows((rs) => [
      ...rs,
      {
        uid: nextUid(),
        day_of_week: day,
        starts_at: '09:00',
        ends_at: '17:00',
        clinic_branch_id: branches[0]?.id ?? null,
        breaks: [],
      },
    ]);

  const onSave = () => {
    const local: Record<string, string> = {};
    for (const r of rows) {
      if (r.ends_at <= r.starts_at) local[r.uid] = t('validation.timeOrder');
      for (const b of r.breaks)
        if (b.ends_at <= b.starts_at || b.starts_at < r.starts_at || b.ends_at > r.ends_at)
          local[r.uid] = t('validation.timeOrder');
    }
    setErrors(local);
    if (Object.keys(local).length) {
      toast.error(t('common.form.fixErrors'));
      return;
    }
    save.mutate(
      rowsForPayload.map(({ clinic_branch_id, day_of_week, starts_at, ends_at, breaks }) => ({
        clinic_branch_id,
        day_of_week,
        starts_at,
        ends_at,
        breaks,
      })),
    );
  };

  const weeklyMinutes = rows.reduce(
    (sum, r) =>
      sum +
      Math.max(0, hhmmToMinutes(r.ends_at) - hhmmToMinutes(r.starts_at)) -
      r.breaks.reduce(
        (b, x) => b + Math.max(0, hhmmToMinutes(x.ends_at) - hhmmToMinutes(x.starts_at)),
        0,
      ),
    0,
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground" data-testid="weekly-hours">
        {t('doctorPanel.schedule.weeklyTotal', {
          hours: f.number(weeklyMinutes / 60),
          windows: f.number(rows.length),
        })}
      </p>
      <div className="grid gap-3 2xl:grid-cols-2">
        {WEEK_ORDER.map((day) => {
          const dayRows = rows
            .filter((r) => r.day_of_week === day)
            .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
          return (
            <section
              key={day}
              className={cn('rounded-xl border bg-card p-4', dayRows.length === 0 && 'bg-muted/30')}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'size-2.5 rounded-full',
                      dayRows.length ? 'bg-emerald-500' : 'bg-slate-300',
                    )}
                    aria-hidden
                  />
                  <h2 className="text-base font-semibold text-foreground">{f.weekday(day)}</h2>
                </div>
                <Button variant="ghost" size="sm" className="text-primary" onClick={() => add(day)}>
                  <Plus aria-hidden />
                  {t('doctorDash.addWindow')}
                </Button>
              </div>
              {dayRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('doctorDash.dayOff')}</p>
              ) : (
                <div className="space-y-3">
                  {dayRows.map((r) => (
                    <ScheduleWindowRow
                      key={r.uid}
                      window={r}
                      branches={branches}
                      error={errors[r.uid]}
                      onChange={(patch) => update(r.uid, patch)}
                      onRemove={() => remove(r.uid)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <StickySaveBar
        dirty={dirty}
        saving={save.isPending}
        onSave={onSave}
        saveLabel={t('doctorDash.saveSchedule')}
        onDiscard={() => {
          setRows(saved.map((w) => ({ ...w, uid: nextUid() })));
          setErrors({});
        }}
      />
    </div>
  );
}
