'use client';

import type { ReactNode } from 'react';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { AvailableDoctor } from '../types';
import { PersonAvatar } from '@/components/shared/PersonAvatar';

/**
 * One volunteer doctor: photo, name, specialties, availability end and current urgent load.
 * `extra` adds a line under the name; `available={false}` replaces the end time and load with `aside`.
 */
export function AvailableDoctorRow({
  doctor: d,
  extra,
  available = true,
  aside,
}: {
  doctor: AvailableDoctor;
  extra?: ReactNode;
  available?: boolean;
  aside?: ReactNode;
}) {
  const t = useT();
  const f = useFormat();
  const pct = d.load.max > 0 ? Math.min(100, Math.round((d.load.active / d.load.max) * 100)) : 0;
  return (
    <li className="flex items-center gap-3 px-(--card-spacing) py-3">
      <PersonAvatar name={d.name} src={d.avatar_url} className="size-10" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{d.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {d.specialties.map((s) => f.l(s)).join('، ') || '—'}
        </p>
        {extra}
      </div>
      {available ? (
        <div className="shrink-0 space-y-1 text-end text-xs text-muted-foreground">
          <p>{t('dashboard.urgent.until', { time: f.time(d.available_until) })}</p>
          <div className="flex items-center justify-end gap-1.5">
            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-200" aria-hidden>
              <span
                className={cn(
                  'block h-full rounded-full',
                  pct >= 100 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500',
                )}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="tabular-nums">
              {t('dashboard.urgent.load', {
                active: f.number(d.load.active),
                max: f.number(d.load.max),
              })}
            </span>
          </div>
        </div>
      ) : (
        aside
      )}
    </li>
  );
}
