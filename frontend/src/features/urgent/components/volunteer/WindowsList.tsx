'use client';

import { Timer } from 'lucide-react';
import type { VolunteerMode, VolunteerWindow } from '../../types';
import { useDurationFormat, useNow } from '@/lib/time';
import { Badge } from '@/components/ui/badge';
import { BUSINESS_TZ } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

export function useModeLabel() {
  const t = useT();
  return (m: VolunteerMode) =>
    m === 'both'
      ? t('doctorUrgent.volunteer.modeBoth')
      : t(
          m === 'online'
            ? 'doctorUrgent.volunteer.acceptsOnline'
            : 'doctorUrgent.volunteer.acceptsInPerson',
        );
}

/** Current and upcoming availability windows with a live countdown and progress for the active one. */
export function WindowsList({ windows }: { windows: VolunteerWindow[] }) {
  const t = useT();
  const f = useFormat();
  const now = useNow(1_000);
  const dur = useDurationFormat();
  const modeLabel = useModeLabel();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t('doctorUrgent.volunteer.windows')}</p>
      {windows.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {t('doctorUrgent.volunteer.noWindows')}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border" data-testid="volunteer-windows">
          {windows.map((w) => {
            const s = new Date(w.starts_at).getTime();
            const e = new Date(w.ends_at).getTime();
            const active = s <= now && e > now;
            return (
              <li key={w.id} className="space-y-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm tabular-nums">
                    {f.dateTime(w.starts_at, BUSINESS_TZ)} – {f.dateTime(w.ends_at, BUSINESS_TZ)}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {active && (
                      <Badge variant="success">{t('doctorUrgent.volunteer.activeNow')}</Badge>
                    )}
                    <Badge variant="info">{t(`doctorUrgent.volunteer.kind.${w.kind}`)}</Badge>
                    <Badge variant="muted">{modeLabel(w.mode)}</Badge>
                  </span>
                </div>
                <p
                  className={cn(
                    'flex items-center gap-1.5 text-sm font-medium tabular-nums',
                    active ? 'text-emerald-700' : 'text-muted-foreground',
                  )}
                  data-testid="window-countdown"
                >
                  <Timer className="size-4" aria-hidden />
                  {active
                    ? t('doctorUrgent.volunteer.endsIn', { time: dur(e - now) })
                    : t('doctorUrgent.volunteer.startsIn', { time: dur(s - now) })}
                </p>
                {active && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-[width] duration-1000"
                      style={{ width: `${Math.min(100, ((now - s) / (e - s)) * 100)}%` }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
