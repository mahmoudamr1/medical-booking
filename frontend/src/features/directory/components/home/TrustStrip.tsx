'use client';

import { Building2, CalendarCheck, ShieldCheck, Stethoscope } from 'lucide-react';
import { Skeleton } from '@/components/shared/states';
import { useFormat, useT } from '@/i18n/provider';
import type { HomeStats } from '../../types';

/** Platform totals under the hero. Shows placeholders while loading; `stats` are real counts only. */
export function TrustStrip({ stats }: { stats: HomeStats | undefined }) {
  const t = useT();
  const f = useFormat();
  const items = [
    { label: t('home.statDoctors'), value: stats?.doctors, icon: Stethoscope },
    { label: t('home.statSpecialties'), value: stats?.specialties, icon: ShieldCheck },
    { label: t('home.statClinics'), value: stats?.clinics, icon: Building2 },
    { label: t('home.statVisits'), value: stats?.completed_visits, icon: CalendarCheck },
  ];
  return (
    <section className="border-b bg-card">
      <dl className="container-page grid grid-cols-2 gap-px py-2 lg:grid-cols-4">
        {items.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 px-2 py-4 sm:px-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-col-reverse">
              <dt className="truncate text-sm text-muted-foreground">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums sm:text-2xl">
                {value === undefined ? <Skeleton className="h-7 w-14" /> : f.number(value)}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
