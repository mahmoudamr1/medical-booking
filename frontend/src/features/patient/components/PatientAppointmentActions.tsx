'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Star, XCircle } from 'lucide-react';
import type { Appointment } from '@/types/api';
import { CancelAppointmentDialog, RescheduleDialog } from './PatientDialogs';
import { RateVisitDialog } from '@/features/reviews';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';

type Action = 'rate' | 'reschedule' | 'cancel';

/**
 * Rate / reschedule / cancel buttons for the patient, driven by the API's `can` flags, plus their dialogs.
 * After a reschedule the patient lands on the new appointment.
 */
export function PatientAppointmentActions({
  appointment: a,
  size = 'sm',
  only,
}: {
  appointment: Appointment;
  size?: 'sm' | 'default';
  only?: Action[];
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState<Action | null>(null);
  const close = (o: boolean) => !o && setOpen(null);
  const show = (act: Action, allowed: boolean | undefined) =>
    !!allowed && (!only || only.includes(act));

  return (
    <>
      {show('rate', a.can?.review) && (
        <Button size={size} onClick={() => setOpen('rate')} data-action="rate">
          <Star aria-hidden />
          {t('reviews.rateVisit')}
        </Button>
      )}
      {show('reschedule', a.can?.reschedule) && (
        <Button
          size={size}
          variant="secondary"
          onClick={() => setOpen('reschedule')}
          data-action="reschedule"
        >
          <CalendarClock aria-hidden />
          {t('appointments.reschedule')}
        </Button>
      )}
      {show('cancel', a.can?.cancel) && (
        <Button
          size={size}
          variant="destructive"
          onClick={() => setOpen('cancel')}
          data-action="cancel"
        >
          <XCircle aria-hidden />
          {t('appointments.cancel')}
        </Button>
      )}
      {open === 'rate' && <RateVisitDialog appointment={a} open onOpenChange={close} />}
      {open === 'cancel' && <CancelAppointmentDialog appointment={a} open onOpenChange={close} />}
      {open === 'reschedule' && (
        <RescheduleDialog
          appointment={a}
          open
          onOpenChange={close}
          onDone={(created) => router.push(`/dashboard/patient/appointments/${created.id}`)}
        />
      )}
    </>
  );
}
