'use client';

import Link from 'next/link';
import { DoctorAvatar } from '@/components/shared/MediaFallback';
import { primarySpecialty } from '@/components/shared/DoctorCard';
import { Skeleton } from '@/components/shared/states';
import { useFormat, useT } from '@/i18n/provider';
import type { DoctorCard } from '@/types/api';
import { ForwardArrow } from '../ForwardArrow';

const VISIBLE_DOCTORS = 4;

/** Hero side card (desktop only): real doctors with their next free slot. Hidden when there are none. */
export function HeroDoctors({ doctors, loading }: { doctors: DoctorCard[]; loading: boolean }) {
  const t = useT();
  const f = useFormat();
  if (!loading && doctors.length === 0) return null;
  return (
    <div className="hidden rounded-2xl border bg-card/90 p-5 shadow-lg shadow-slate-900/5 backdrop-blur lg:block">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="font-semibold">{t('home.availableSoonTitle')}</p>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
          {t('home.liveAvailability')}
        </span>
      </div>
      {loading ? (
        <div className="grid gap-2" role="status" aria-label={t('common.loading')}>
          {Array.from({ length: VISIBLE_DOCTORS }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <ul className="grid gap-2">
          {doctors.slice(0, VISIBLE_DOCTORS).map((doctor) => (
            <li key={doctor.id}>
              <Link
                href={`/doctor/${doctor.id}#booking`}
                className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-accent"
              >
                <DoctorAvatar
                  name={doctor.name}
                  url={doctor.avatar_url}
                  className="size-12 text-sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium group-hover:text-primary">
                    {doctor.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {doctor.next_available_at
                      ? f.dateTime(doctor.next_available_at)
                      : f.l(primarySpecialty(doctor.specialties))}
                  </span>
                </span>
                <ForwardArrow className="text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
