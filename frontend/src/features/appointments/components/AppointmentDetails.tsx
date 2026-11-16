'use client';

import type { ReactNode } from 'react';
import {
  CalendarDays,
  Clock,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Stethoscope,
  UserRound,
  Video,
} from 'lucide-react';
import type { Appointment } from '@/types/api';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AppointmentTimeline } from './AppointmentTimeline';
import { BUSINESS_TZ } from '@/i18n/format';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

/**
 * Full appointment details + status history. `variant="sheet"` drops the outer cards so it fits a
 * side sheet; the default page variant is used by the patient page and the clinic dialog.
 */
export function AppointmentDetails({
  appointment: a,
  perspective,
  actions,
  variant = 'page',
}: {
  appointment: Appointment;
  perspective: 'patient' | 'doctor';
  actions?: ReactNode;
  variant?: 'page' | 'sheet';
}) {
  const t = useT();
  const f = useFormat();
  const tz = a.timezone ?? BUSINESS_TZ;
  const specialty = a.doctor?.specialties?.find((s) => s.is_primary) ?? a.doctor?.specialties?.[0];
  const place =
    a.consultation_type === 'online'
      ? t('common.online')
      : [f.l(a.branch?.clinic), f.l(a.branch), f.l(a.branch, 'address'), f.l(a.branch?.city)]
          .filter(Boolean)
          .join(' – ');
  const sheet = variant === 'sheet';

  const rows: { icon: ReactNode; label: string; value: ReactNode }[] = [
    { icon: <CalendarDays />, label: t('appointments.date'), value: f.date(a.starts_at, tz) },
    {
      icon: <Clock />,
      label: t('appointments.time'),
      value: (
        <span className="tabular-nums">
          {f.time(a.starts_at, tz)} – {f.time(a.ends_at, tz)} ·{' '}
          {t('common.minutes', { count: f.number(a.duration_minutes) })}
        </span>
      ),
    },
    {
      icon: a.consultation_type === 'online' ? <Video /> : <MapPin />,
      label: t('appointments.clinic'),
      value: place || '—',
    },
    {
      icon: <Stethoscope />,
      label: t('booking.service'),
      value: [f.l(a.service), t(`consultation.${a.consultation_type}`)].filter(Boolean).join(' · '),
    },
    {
      icon: <Receipt />,
      label: t('appointments.price'),
      value: <span className="font-semibold">{f.money(a.price)}</span>,
    },
  ];

  const person =
    perspective === 'patient' ? (
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{t('appointments.doctor')}</p>
        <p className="truncate font-semibold">{a.doctor?.name ?? '—'}</p>
        <p className="truncate text-sm text-muted-foreground">
          {[f.l(a.doctor, 'title'), specialty ? f.l(specialty) : null].filter(Boolean).join(' · ')}
        </p>
      </div>
    ) : (
      <div className="min-w-0 space-y-1">
        <p className="text-xs text-muted-foreground">{t('appointments.patient')}</p>
        <p className="truncate font-semibold">{a.patient?.name ?? '—'}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {a.patient?.phone && (
            <a
              href={`tel:${a.patient.phone}`}
              className="inline-flex min-h-9 items-center gap-1.5 text-primary hover:underline"
              dir="ltr"
            >
              <Phone className="size-4" aria-hidden />
              {a.patient.phone}
            </a>
          )}
          {a.patient?.email && (
            <a
              href={`mailto:${a.patient.email}`}
              className="inline-flex min-h-9 min-w-0 items-center gap-1.5 text-primary hover:underline"
              dir="ltr"
            >
              <Mail className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{a.patient.email}</span>
            </a>
          )}
        </div>
      </div>
    );

  return (
    <div className="space-y-6" data-testid="appointment-details">
      <section className={cn(!sheet && 'rounded-xl border bg-card p-5 sm:p-6')}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {sheet ? (
            <p className="font-mono text-xs text-muted-foreground" dir="ltr">
              {a.reference}
            </p>
          ) : (
            <h2 className="text-lg font-semibold text-foreground">{t('common.details')}</h2>
          )}
          <StatusBadge status={a.status} className="text-sm" />
        </div>

        <div className="mb-4 flex items-start gap-3 rounded-xl bg-muted/50 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
            <UserRound className="size-5" aria-hidden />
          </span>
          {person}
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label} className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 text-muted-foreground [&_svg]:size-4" aria-hidden>
                {r.icon}
              </span>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">{r.label}</dt>
                <dd className="text-sm font-medium text-foreground">{r.value}</dd>
              </div>
            </div>
          ))}
          {!sheet && (
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 w-4" aria-hidden />
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">{t('appointments.reference')}</dt>
                <dd className="font-mono text-sm" dir="ltr">
                  {a.reference}
                </dd>
              </div>
            </div>
          )}
        </dl>

        {a.patient_notes && (
          <div className="mt-4 rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{t('appointments.notes')}</p>
            <p className="text-sm whitespace-pre-line text-foreground">{a.patient_notes}</p>
          </div>
        )}
        {a.cancellation_reason && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs text-red-700">{t('appointments.cancellationReason')}</p>
            <p className="text-sm whitespace-pre-line text-foreground">{a.cancellation_reason}</p>
          </div>
        )}
        {actions && <div className="mt-6 flex flex-wrap gap-2">{actions}</div>}
      </section>

      {a.history && a.history.length > 0 && (
        <section className={cn(!sheet && 'rounded-xl border bg-card p-5 sm:p-6')}>
          <h2 className="mb-4 text-base font-semibold text-foreground">
            {t('appointments.history')}
          </h2>
          <AppointmentTimeline appointment={a} />
        </section>
      )}
    </div>
  );
}
