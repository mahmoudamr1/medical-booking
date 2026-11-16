'use client';

import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { useFormat, useT } from '@/i18n/provider';
import type { DoctorCard, Specialty } from '@/types/api';
import { searchHref } from '../../searchParams';
import { HeroDoctors } from './HeroDoctors';
import { HeroSearchForm } from './HeroSearchForm';

const POPULAR_SPECIALTIES = 5;

export function Hero({
  specialties,
  doctors,
  loading,
}: {
  specialties: Specialty[];
  doctors: DoctorCard[];
  loading: boolean;
}) {
  const t = useT();
  const f = useFormat();

  return (
    <section className="relative isolate overflow-hidden border-b">
      {/* Calm brand-tinted backdrop (no photography): soft radial tints + dot grid. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_85%_-10%,oklch(0.93_0.05_185/0.9),transparent_60%),radial-gradient(40rem_24rem_at_0%_110%,oklch(0.95_0.04_160/0.8),transparent_60%)] rtl:bg-[radial-gradient(60rem_30rem_at_15%_-10%,oklch(0.93_0.05_185/0.9),transparent_60%),radial-gradient(40rem_24rem_at_100%_110%,oklch(0.95_0.04_160/0.8),transparent_60%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 [background-image:radial-gradient(oklch(0.85_0.03_200)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_85%)] [background-size:22px_22px] opacity-50"
      />
      <div className="container-page grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_24rem] lg:py-20">
        <div className="max-w-2xl space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-3 py-1 text-sm font-medium text-primary backdrop-blur">
            <BadgeCheck className="size-4" aria-hidden />
            {t('home.heroBadge')}
          </span>
          <div className="space-y-3">
            <h1 className="text-[clamp(2rem,1.4rem+2.6vw,3.5rem)] leading-[1.15] font-bold">
              {t('home.heroTitle')}
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
              {t('home.heroSubtitle')}
            </p>
          </div>

          <HeroSearchForm specialties={specialties} />

          {specialties.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('home.popular')}</span>
              {specialties.slice(0, POPULAR_SPECIALTIES).map((specialty) => (
                <Link
                  key={specialty.id}
                  href={searchHref({ specialty: specialty.slug })}
                  className="inline-flex min-h-9 items-center rounded-full border bg-card/80 px-3 text-sm text-foreground backdrop-blur transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {f.l(specialty)}
                </Link>
              ))}
            </div>
          )}
        </div>
        <HeroDoctors doctors={doctors} loading={loading} />
      </div>
    </section>
  );
}
