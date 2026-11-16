'use client';

import { CalendarCheck, CalendarPlus, CheckCircle2, Clock, UserX, XCircle } from 'lucide-react';
import type { Appointment, AppointmentStatus } from '@/types/api';
import { StatusBadge, statusVariant } from '@/components/shared/StatusBadge';
import { BUSINESS_TZ } from '@/i18n/format';
import { useFormat, useT } from '@/i18n/provider';
import type { TranslationKey } from '@/i18n/translate';
import { cn } from '@/lib/utils';

const DOT: Record<ReturnType<typeof statusVariant>, string> = {
  success: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-100 text-amber-700 ring-amber-200',
  info: 'bg-sky-100 text-sky-700 ring-sky-200',
  muted: 'bg-slate-100 text-slate-600 ring-slate-200',
  danger: 'bg-red-100 text-red-700 ring-red-200',
};

function Icon({ status }: { status: AppointmentStatus }) {
  if (status === 'confirmed') return <CalendarCheck aria-hidden />;
  if (status === 'completed') return <CheckCircle2 aria-hidden />;
  if (status === 'pending_confirmation') return <Clock aria-hidden />;
  if (status === 'no_show') return <UserX aria-hidden />;
  return <XCircle aria-hidden />;
}

/** Vertical status history (booking → confirmation → completion/cancellation) with actor and reason. */
export function AppointmentTimeline({ appointment: a }: { appointment: Appointment }) {
  const t = useT();
  const f = useFormat();
  const tz = a.timezone ?? BUSINESS_TZ;
  const history = a.history ?? [];

  return (
    <ol className="space-y-0" data-testid="appointment-timeline">
      {a.created_at && history[0]?.from !== null && (
        <li className="relative flex gap-3 pb-5">
          <span className="absolute start-4 top-9 bottom-0 w-px bg-border" aria-hidden />
          <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary ring-4 ring-card [&_svg]:size-4">
            <CalendarPlus aria-hidden />
          </span>
          <div className="pt-1">
            <p className="text-sm font-medium">{t('patientPanel.detail.booked')}</p>
            <p className="text-xs text-muted-foreground">{f.dateTime(a.created_at, tz)}</p>
          </div>
        </li>
      )}
      {history.map((h, i) => {
        const last = i === history.length - 1;
        return (
          <li key={`${h.to}-${h.at}-${i}`} className={cn('relative flex gap-3', !last && 'pb-5')}>
            {!last && (
              <span className="absolute start-4 top-9 bottom-0 w-px bg-border" aria-hidden />
            )}
            <span
              className={cn(
                'relative flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card [&_svg]:size-4',
                DOT[statusVariant(h.to)],
              )}
            >
              <Icon status={h.to} />
            </span>
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={h.to} />
                <time className="text-xs text-muted-foreground" dateTime={h.at}>
                  {f.dateTime(h.at, tz)}
                </time>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('appointments.historyBy', {
                  role: t(`appointments.actor.${h.actor_role}` as TranslationKey),
                })}
              </p>
              {h.reason && (
                <p className="mt-1 text-sm whitespace-pre-line text-foreground">{h.reason}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
