'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, ChevronRight, Star } from 'lucide-react';
import { DoctorAvatar, doctorAvatarPath } from '@/components/shared/MediaFallback';
import { Skeleton } from '@/components/shared/states';
import { PatientAppointmentActions } from './PatientAppointmentActions';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { appointmentsApi, appointmentKeys } from '@/features/appointments';
import { BUSINESS_TZ } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';

/** "Your next appointment" hero, from page 1 of the upcoming list. */
export function NextAppointmentCard() {
  const t = useT();
  const f = useFormat();
  const upcoming = useQuery({
    queryKey: appointmentKeys.patientList('upcoming', 1),
    queryFn: () => appointmentsApi.patientList('upcoming', 1),
  });
  if (upcoming.isPending) return <Skeleton className="h-28 w-full rounded-xl" />;
  const next = upcoming.data?.items[0];
  if (!next) return null;
  const tz = next.timezone ?? BUSINESS_TZ;

  return (
    <Card
      className="gap-0 bg-primary py-0 text-primary-foreground ring-0"
      data-testid="next-appointment"
    >
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <DoctorAvatar
            name={next.doctor?.name}
            url={doctorAvatarPath(next.doctor?.id)}
            className="size-14 border-white/30 text-base"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm opacity-90">
              <CalendarCheck className="size-4" aria-hidden />
              {t('patientPanel.dashboard.nextTitle')}
            </p>
            <p className="truncate text-lg font-semibold">{next.doctor?.name}</p>
            <p className="text-sm opacity-90">
              {f.date(next.starts_at, tz, { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
              <span className="tabular-nums">{f.time(next.starts_at, tz)}</span>
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/patient/appointments/${next.id}`}
          className={buttonVariants({ variant: 'secondary', className: 'shrink-0' })}
        >
          {t('appointments.view')}
          <ChevronRight className="rtl:rotate-180" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}

/** Prompt to rate the most recent completed visit that has no review yet. */
export function RateVisitPrompt() {
  const t = useT();
  const completed = useQuery({
    queryKey: appointmentKeys.patientList('completed', 1),
    queryFn: () => appointmentsApi.patientList('completed', 1),
  });
  const reviewable = completed.data?.items.find((a) => a.can?.review);
  if (!reviewable) return null;

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid="rate-prompt"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-amber-500">
          <Star className="size-5 fill-current" aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-amber-950">{t('patientPanel.dashboard.rateTitle')}</p>
          <p className="text-sm text-amber-900">
            {t('patientPanel.dashboard.rateBody', { doctor: reviewable.doctor?.name ?? '' })}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <PatientAppointmentActions appointment={reviewable} only={['rate']} />
      </div>
    </div>
  );
}
