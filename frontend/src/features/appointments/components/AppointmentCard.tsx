'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { CalendarDays, Clock, UserRound, Video } from 'lucide-react';
import { ClinicLogo, DoctorAvatar, doctorAvatarPath } from '@/components/shared/MediaFallback';
import type { Appointment } from '@/types/api';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { primarySpecialty } from '@/components/shared/DoctorCard';
import { useFormat, useT } from '@/i18n/provider';
import { BUSINESS_TZ } from '@/i18n/format';

/**
 * Appointment summary: counterpart (doctor with avatar for patients, patient for the care side),
 * date/time in the doctor's timezone (Cairo), clinic logo + branch (or online), fee, status and the
 * actions passed in by the screen. With `href` the counterpart links to the detail page.
 */
export function AppointmentCard({
  appointment: a,
  perspective = 'patient',
  actions,
  href,
}: {
  appointment: Appointment;
  perspective?: 'patient' | 'doctor';
  actions?: ReactNode;
  href?: string;
}) {
  const t = useT();
  const f = useFormat();
  const tz = a.timezone ?? BUSINESS_TZ;
  const specialty = primarySpecialty(a.doctor?.specialties);
  const clinic = a.branch?.clinic;
  const online = a.consultation_type === 'online';
  const patientView = perspective === 'patient';

  const who = (
    <>
      {patientView ? (
        <DoctorAvatar
          name={a.doctor?.name}
          url={doctorAvatarPath(a.doctor?.id)}
          className="size-12 text-sm"
        />
      ) : (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
          <UserRound className="size-5" aria-hidden />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-semibold">
          {patientView ? a.doctor?.name : a.patient?.name}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {[patientView && specialty ? f.l(specialty) : null, f.l(a.service)]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
    </>
  );

  return (
    <Card
      className="gap-0 py-0"
      data-testid="appointment-card"
      data-reference={a.reference}
      data-status={a.status}
    >
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          {href ? (
            <Link
              href={href}
              className="flex min-w-0 items-start gap-3 rounded-lg hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {who}
            </Link>
          ) : (
            <div className="flex min-w-0 items-start gap-3">{who}</div>
          )}
          <StatusBadge status={a.status} />
        </div>

        <dl className="flex flex-wrap gap-x-5 gap-y-2 rounded-lg bg-muted/50 p-3 text-sm">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <dt className="sr-only">{t('appointments.date')}</dt>
            <dd className="whitespace-nowrap">
              {f.date(a.starts_at, tz, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <dt className="sr-only">{t('appointments.time')}</dt>
            <dd className="whitespace-nowrap tabular-nums">
              {f.time(a.starts_at, tz)} – {f.time(a.ends_at, tz)}
            </dd>
          </div>
        </dl>

        <div className="flex min-w-0 items-center gap-3">
          {online ? (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <Video className="size-4" aria-hidden />
            </span>
          ) : (
            <ClinicLogo name={f.l(clinic)} url={clinic?.logo_url} className="size-9 rounded-lg" />
          )}
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">
              {online
                ? t('common.online')
                : f.l(clinic) || t(`consultation.${a.consultation_type}`)}
            </p>
            {!online && (
              <p className="truncate text-muted-foreground">
                {[f.l(a.branch), f.l(a.branch?.city)].filter(Boolean).join('، ')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{f.money(a.price)}</p>
          <p className="font-mono text-xs text-muted-foreground" dir="ltr">
            {a.reference}
          </p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </Card>
  );
}
