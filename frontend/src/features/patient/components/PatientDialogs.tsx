'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Appointment } from '@/types/api';
import type { AvailabilitySlot } from '@/features/booking';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SlotPicker, bookingKeys } from '@/features/booking';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { appointmentsApi, appointmentKeys } from '@/features/appointments';
import { isApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { BUSINESS_TZ } from '@/i18n/format';
import { useFormat, useT } from '@/i18n/provider';

/** Invalidate everything that lists or shows appointments for the patient. */
function useRefreshPatient() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: appointmentKeys.patient });
    queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
  };
}

export function CancelAppointmentDialog({
  appointment,
  open,
  onOpenChange,
  onDone,
}: {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: (updated: Appointment) => void;
}) {
  const t = useT();
  const f = useFormat();
  const refresh = useRefreshPatient();
  const [error, setError] = useState<string | null>(null);

  const cancel = useMutation({
    mutationFn: (reason: string) =>
      appointmentsApi.transition(appointment.id, 'cancel', reason || undefined),
    onSuccess: ({ data, message }) => {
      toast.success(message || t('appointments.cancelled'));
      onOpenChange(false);
      refresh();
      onDone?.(data);
    },
    // policy_violation / too_late / invalid_transition arrive as localized 409 messages.
    onError: (e) => setError(errorMessage(e, t)),
  });

  const hours = appointment.doctor?.min_cancellation_hours;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => {
        setError(null);
        onOpenChange(o);
      }}
      title={t('appointments.cancelTitle')}
      description={
        <>
          {t('appointments.cancelBody')}
          {typeof hours === 'number' && hours > 0 && (
            <span className="mt-2 block">
              {t('appointments.policy', { hours: f.number(hours) })}
            </span>
          )}
        </>
      }
      confirmLabel={t('appointments.cancel')}
      destructive
      pending={cancel.isPending}
      error={error}
      reason={{ label: t('common.reason'), placeholder: t('appointments.cancelReasonPlaceholder') }}
      onConfirm={(reason) => {
        setError(null);
        cancel.mutate(reason);
      }}
    />
  );
}

export function RescheduleDialog({
  appointment,
  open,
  onOpenChange,
  onDone,
}: {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: (created: Appointment) => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const refresh = useRefreshPatient();
  const [slot, setSlot] = useState<AvailabilitySlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const doctorId = appointment.doctor?.id;
  const serviceId = appointment.service?.id;
  const tz = appointment.timezone ?? BUSINESS_TZ;

  const reschedule = useMutation({
    mutationFn: (startsAt: string) => appointmentsApi.reschedule(appointment.id, startsAt),
    onSuccess: ({ data, message }) => {
      toast.success(message || t('appointments.rescheduled'));
      setSlot(null);
      onOpenChange(false);
      refresh();
      onDone?.(data);
    },
    onError: (e) => {
      if (isApiError(e) && e.status === 409 && e.code === 'booking_conflict') {
        setSlot(null);
        setError(t('errors.slotTaken'));
        if (doctorId)
          queryClient.invalidateQueries({
            queryKey: bookingKeys.availability(doctorId, serviceId ?? null),
          });
        return;
      }
      setError(errorMessage(e, t));
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (reschedule.isPending) return;
        setError(null);
        setSlot(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('appointments.rescheduleTitle')}</DialogTitle>
          <DialogDescription>{t('appointments.rescheduleNote')}</DialogDescription>
        </DialogHeader>
        {doctorId && serviceId ? (
          <SlotPicker
            doctorId={doctorId}
            serviceId={serviceId}
            tz={tz}
            selected={slot}
            onSelect={setSlot}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t('errors.generic')}</p>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={reschedule.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            disabled={!slot || reschedule.isPending}
            onClick={() => slot && (setError(null), reschedule.mutate(slot.starts_at))}
          >
            {reschedule.isPending ? t('common.saving') : t('appointments.rescheduleConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
