'use client';

import type { ReactNode } from 'react';
import { CalendarCheck, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useT } from '@/i18n/provider';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useT();
  const points = [
    { icon: ShieldCheck, text: t('info.verifiedBody') },
    { icon: CalendarCheck, text: t('info.realTimeBody') },
    { icon: Stethoscope, text: t('info.privacyBody') },
  ];
  return (
    <MainLayout>
      <div className="container-page py-8 sm:py-12">
        <div className="grid overflow-hidden rounded-2xl border bg-card lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Brand side panel (no photography): hidden on phones and tablets. */}
          <div className="relative isolate hidden flex-col justify-between gap-10 overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 [background-image:radial-gradient(oklch(1_0_0/0.14)_1px,transparent_1px)] [background-size:22px_22px]"
            />
            <div
              aria-hidden
              className="absolute -end-24 -top-24 -z-10 size-72 rounded-full bg-white/10"
            />
            <div
              aria-hidden
              className="absolute -start-20 -bottom-28 -z-10 size-80 rounded-full bg-emerald-300/20"
            />
            <span
              className="flex size-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"
              aria-hidden
            >
              <HeartPulse className="size-7" />
            </span>
            <div className="space-y-6">
              <h2 className="text-2xl leading-snug font-semibold text-white">
                {t('home.heroSubtitle')}
              </h2>
              <ul className="grid gap-4">
                {points.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-white/90">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="pt-2">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mx-auto flex w-full max-w-md flex-col justify-center gap-6 px-5 py-8 sm:px-8 sm:py-12">
            <div className="space-y-1">
              <h1 className="text-[clamp(1.5rem,1.3rem+0.8vw,1.875rem)] font-semibold">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {children}
            {footer && (
              <div className="space-y-2 border-t pt-5 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
