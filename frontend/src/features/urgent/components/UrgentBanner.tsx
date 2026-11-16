'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, ShieldCheck, Stethoscope, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconPanel } from '@/components/shared/IconPanel';
import { useFormat, useT } from '@/i18n/provider';
import { urgentApi } from '../api';
import { URGENT_KEYS } from '../hooks/keys';

/** Home-page call to action with the live number of available volunteer doctors. */
/** "Talk to a doctor available now" banner linking to the live urgent consultation flow. */
export function UrgentBanner() {
  const t = useT();
  const f = useFormat();
  // Live count of doctors available right now; refreshed every minute while the page is open.
  const available = useQuery({
    queryKey: URGENT_KEYS.available(),
    queryFn: () => urgentApi.availableDoctors(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const count = available.data?.count;
  return (
    <section className="py-12 sm:py-16">
      <div className="container-page">
        <div className="grid overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="flex flex-col gap-6 p-6 sm:p-10">
            <div className="flex gap-4">
              <span className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Stethoscope className="size-6" aria-hidden />
                <span
                  className="absolute -end-0.5 -top-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-emerald-50 motion-safe:animate-pulse"
                  aria-hidden
                />
              </span>
              <div className="space-y-2">
                <h2 className="text-[clamp(1.375rem,1.1rem+1vw,2rem)] leading-tight font-semibold text-emerald-950">
                  {t('home.urgentTitle')}
                </h2>
                <p className="text-emerald-950/80">{t('home.urgentBody')}</p>
                {typeof count === 'number' && count > 0 && (
                  <p
                    className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-emerald-800"
                    aria-live="polite"
                  >
                    <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
                    {t('home.urgentAvailableCount', { count: f.number(count) })}
                  </p>
                )}
              </div>
            </div>
            <Button asChild variant="success" size="lg" className="w-full sm:w-fit">
              <Link href="/urgent">
                {t('home.urgentButton')}
                <ArrowRight className="rtl:rotate-180" aria-hidden />
              </Link>
            </Button>
          </div>
          <IconPanel
            icon={Video}
            className="m-4 hidden rounded-xl lg:m-6 lg:flex"
            chips={[
              { icon: Clock, label: t('home.urgentChip') },
              { icon: ShieldCheck, label: t('doctor.verified') },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
