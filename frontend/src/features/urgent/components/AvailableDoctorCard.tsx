'use client';

import Link from 'next/link';
import { BadgeCheck, Building2, Clock, MapPin, Video } from 'lucide-react';
import { DoctorAvatar } from '@/components/shared/MediaFallback';
import { RatingInline } from '@/components/shared/DoctorCard';
import { Button } from '@/components/ui/button';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { AvailableDoctor, UrgentDoctorRef } from '../types';

const MODE_ICON = { online: Video, in_person: Building2 } as const;

/** One doctor in the "available now" list, with a directed-request button. */
export function AvailableDoctorCard({
  doctor,
  onRequest,
}: {
  doctor: AvailableDoctor;
  onRequest: (doctor: UrgentDoctorRef) => void;
}) {
  const t = useT();
  const f = useFormat();
  const title = f.l(doctor, 'title');
  const city = f.l(doctor.city);

  return (
    <article
      data-testid="available-doctor"
      className="flex h-full flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <span className="relative shrink-0">
          <DoctorAvatar name={doctor.name} url={doctor.avatar_url} className="size-14" />
          <span
            className="absolute end-0 bottom-0 size-3.5 rounded-full bg-emerald-500 ring-2 ring-card"
            aria-hidden
          />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h3 className="flex items-center gap-1.5 leading-snug font-semibold">
            <Link
              href={`/doctor/${doctor.id}`}
              className="truncate hover:text-primary focus-visible:text-primary"
            >
              {doctor.name}
            </Link>
            <BadgeCheck
              className="size-4 shrink-0 text-primary"
              aria-label={t('doctor.verified')}
            />
          </h3>
          {title && <p className="line-clamp-1 text-sm text-muted-foreground">{title}</p>}
          <RatingInline avg={doctor.rating_avg} count={doctor.rating_count} />
        </div>
      </div>

      {doctor.specialties.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {doctor.specialties.slice(0, 3).map((s) => (
            <li
              key={s.id}
              className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {f.l(s)}
            </li>
          ))}
        </ul>
      )}

      <ul className="grid gap-1.5 text-sm text-muted-foreground">
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {doctor.modes.map((m) => {
            const Icon = MODE_ICON[m];
            return (
              <span key={m} className="inline-flex items-center gap-1.5">
                <Icon className="size-4 text-primary" aria-hidden />
                {t(`urgent.mode.${m}`)}
              </span>
            );
          })}
        </li>
        {city && (
          <li className="flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {city}
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <Clock className="size-4 shrink-0" aria-hidden />
          {t('urgent.available.availableUntil', { time: f.time(doctor.available_until) })}
        </li>
      </ul>

      <LoadMeter active={doctor.load.active} max={doctor.load.max} />

      <Button
        size="lg"
        variant="outline"
        className="mt-auto w-full border-primary/40 text-primary hover:bg-accent hover:text-primary"
        onClick={() => onRequest({ id: doctor.id, name: doctor.name })}
      >
        {t('urgent.available.requestThis')}
      </Button>
    </article>
  );
}

/** Current urgent workload as filled segments (active of max). */
function LoadMeter({ active, max }: { active: number; max: number }) {
  const t = useT();
  const f = useFormat();
  const label =
    active === 0
      ? t('urgent.available.loadFree')
      : t('urgent.available.load', { active: f.number(active), max: f.number(max) });
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: Math.max(1, max) }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              i < active ? 'bg-amber-400' : 'bg-emerald-200',
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
