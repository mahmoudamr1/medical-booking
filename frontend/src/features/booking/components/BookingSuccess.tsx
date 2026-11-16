'use client';

import Link from 'next/link';
import { CheckCircle2, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/api';

/** Confirmation shown after a successful booking (confirmed instantly or awaiting the doctor). */
export function BookingSuccess({
  appointment: a,
  tz,
  onBookAnother,
}: {
  appointment: Appointment;
  tz: string;
  onBookAnother: () => void;
}) {
  const t = useT();
  const f = useFormat();
  const confirmed = a.status === 'confirmed';
  return (
    <div className="space-y-5 text-center" role="status" data-testid="booking-success">
      <span
        className={cn(
          'mx-auto flex size-14 items-center justify-center rounded-full',
          confirmed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
        )}
      >
        {confirmed ? (
          <CheckCircle2 className="size-8" aria-hidden />
        ) : (
          <Hourglass className="size-8" aria-hidden />
        )}
      </span>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">
          {confirmed ? t('booking.successConfirmedTitle') : t('booking.successPendingTitle')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {confirmed ? t('booking.successConfirmedBody') : t('booking.successPendingBody')}
        </p>
      </div>
      <dl className="grid gap-2 rounded-lg border bg-muted/40 p-4 text-start text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t('booking.reference')}</dt>
          <dd className="font-mono font-semibold" dir="ltr">
            {a.reference}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t('booking.date')}</dt>
          <dd>
            {f.date(a.starts_at, tz)} · {f.time(a.starts_at, tz)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t('common.status')}</dt>
          <dd>{t(`status.${a.status}`)}</dd>
        </div>
      </dl>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild>
          <Link href={`/dashboard/patient/appointments/${a.id}`}>
            {t('booking.viewAppointments')}
          </Link>
        </Button>
        <Button variant="outline" onClick={onBookAnother}>
          {t('booking.bookAnother')}
        </Button>
      </div>
    </div>
  );
}
