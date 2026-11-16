'use client';

import Link from 'next/link';
import { Search, CalendarDays, CheckCircle2, Video, Check } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { Band } from '../Band';
import { SectionHeading } from './SectionHeading';

export { DoctorsRow } from './DoctorsRow';
export { TrustStrip } from './TrustStrip';

export function HowItWorks() {
  const t = useT();

  const steps = [
    {
      num: 1,
      icon: Search,
      title: t('home.how1Title'),
      body: t('home.how1Body'),
    },
    {
      num: 2,
      icon: CalendarDays,
      title: t('home.how2Title'),
      body: t('home.how2Body'),
    },
    {
      num: 3,
      icon: CheckCircle2,
      title: t('home.how3Title'),
      body: t('home.how3Body'),
    },
  ];

  return (
    <Band className="bg-muted/30">
      <SectionHeading title={t('home.howTitle')} />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="relative flex flex-col items-start gap-4 rounded-2xl border bg-card p-6 shadow-sm"
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Band>
  );
}

export function Telemedicine() {
  const t = useT();

  const perks = [t('home.tele1'), t('home.tele2'), t('home.tele3')];

  return (
    <Band layout="split" className="border-y bg-primary/[0.02]">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Video className="size-3.5" aria-hidden />
          <span>{t('home.teleChipTime')}</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t('home.teleTitle')}
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">
            {t('home.teleBody')}
          </p>
        </div>
        <ul className="space-y-3">
          {perks.map((perk, i) => (
            <li key={i} className="flex items-center gap-3 text-sm sm:text-base">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="size-3.5" strokeWidth={2.5} />
              </span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>
        <div>
          <Link
            href="/search?type=video"
            className={buttonVariants({ size: 'lg' })}
          >
            {t('home.teleCta')}
          </Link>
        </div>
      </div>
      <div className="flex items-center justify-center">
        <div className="relative flex aspect-square w-full max-w-sm items-center justify-center rounded-3xl border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Video className="size-10" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">{t('home.teleTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('home.teleChipDevice')}</p>
            </div>
          </div>
        </div>
      </div>
    </Band>
  );
}
