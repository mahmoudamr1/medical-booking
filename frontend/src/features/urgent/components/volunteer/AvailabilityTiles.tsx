'use client';

import { useState, type ReactNode } from 'react';
import { CalendarClock, Moon, Plus, Zap } from 'lucide-react';
import type { AvailabilityPayload, VolunteerMode } from '../../types';
import { Button } from '@/components/ui/button';
import { Field, NativeSelect } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zonedLocalToIso, zonedLocalValue, BUSINESS_TZ } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';

/** Cairo wall-clock value `hours` after the next full hour (default for the scheduled window). */
function nextHourLocal(hours: number): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return zonedLocalValue(new Date(d.getTime() + (hours + 1) * 3600_000), BUSINESS_TZ);
}

function Tile({
  icon,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary [&_svg]:size-4"
          aria-hidden
        >
          {icon}
        </span>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="mt-auto grid gap-2">{children}</div>
    </div>
  );
}

/** The three ways to become available: now for N hours, tonight, or a scheduled window (Cairo time). */
export function AvailabilityTiles({
  mode,
  busy,
  error,
  onAdd,
}: {
  mode: VolunteerMode;
  busy: boolean;
  /** Validation message from the API for the scheduled window. */
  error: string | null;
  onAdd: (body: AvailabilityPayload) => void;
}) {
  const t = useT();
  const f = useFormat();
  const [hours, setHours] = useState('2');
  const [start, setStart] = useState(() => nextHourLocal(0));
  const [end, setEnd] = useState(() => nextHourLocal(4));
  const [localError, setLocalError] = useState<string | null>(null);
  const scheduleError = localError ?? error;

  const submitScheduled = () => {
    setLocalError(null);
    if (!start || !end || end <= start)
      return setLocalError(t('doctorUrgent.volunteer.windowInvalid'));
    onAdd({
      kind: 'scheduled',
      starts_at: zonedLocalToIso(start, BUSINESS_TZ),
      ends_at: zonedLocalToIso(end, BUSINESS_TZ),
      mode,
    });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Tile
        icon={<Zap />}
        title={<label htmlFor="avail-hours">{t('doctorUrgent.volunteer.nowFor')}</label>}
        hint={t('doctorUrgent.volunteer.nowHint')}
      >
        <div className="flex gap-2">
          <NativeSelect
            id="avail-hours"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-28 shrink-0"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
              <option key={h} value={h}>
                {t('doctorUrgent.volunteer.hours', { count: f.number(h) })}
              </option>
            ))}
          </NativeSelect>
          <Button
            disabled={busy}
            onClick={() => onAdd({ kind: 'now', hours: Number(hours), mode })}
            className="flex-1"
            data-testid="go-available-now"
          >
            {t('doctorUrgent.volunteer.goNow')}
          </Button>
        </div>
      </Tile>
      <Tile
        icon={<Moon />}
        title={t('doctorUrgent.volunteer.kind.tonight')}
        hint={t('doctorUrgent.volunteer.tonightHint')}
      >
        <Button variant="outline" disabled={busy} onClick={() => onAdd({ kind: 'tonight', mode })}>
          {t('doctorUrgent.volunteer.tonight')}
        </Button>
      </Tile>
      <Tile
        icon={<CalendarClock />}
        title={t('doctorUrgent.volunteer.scheduled')}
        hint={t('doctorUrgent.volunteer.scheduledHint')}
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Field
            label={t('doctorUrgent.volunteer.startsAt')}
            htmlFor="avail-start"
            className="gap-1"
          >
            <Input
              id="avail-start"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label={t('doctorUrgent.volunteer.endsAt')} htmlFor="avail-end" className="gap-1">
            <Input
              id="avail-end"
              type="datetime-local"
              value={end}
              min={start}
              onChange={(e) => setEnd(e.target.value)}
            />
          </Field>
        </div>
        {scheduleError && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {scheduleError}
          </p>
        )}
        <Button variant="outline" disabled={busy} onClick={submitScheduled}>
          <Plus aria-hidden />
          {t('doctorUrgent.volunteer.addScheduled')}
        </Button>
      </Tile>
    </div>
  );
}
