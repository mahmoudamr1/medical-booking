'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Appointment, AppointmentAction } from '@/types/api';
import { CLINIC_PERMISSIONS } from '../types';
import { AppointmentDetails } from '@/features/appointments';
import { availableDoctorActions } from '@/features/doctor';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { clinicApi } from '../api';
import { clinicKeys } from '../hooks/keys';
import { errorMessage } from '@/lib/api/errors';
import { useT } from '@/i18n/provider';
import type { TranslationKey } from '@/i18n/translate';
import { useClinic } from './ClinicContext';

interface ActionConfig {
  label: TranslationKey;
  done: TranslationKey;
  title: TranslationKey;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  reasonRequired?: boolean;
}

const ACTIONS: Record<AppointmentAction, ActionConfig> = {
  confirm: {
    label: 'appointments.confirm',
    done: 'appointments.confirmed',
    title: 'appointments.confirm',
    variant: 'default',
  },
  reject: {
    label: 'appointments.reject',
    done: 'appointments.rejected',
    title: 'appointments.rejectTitle',
    variant: 'destructive',
    reasonRequired: true,
  },
  complete: {
    label: 'appointments.complete',
    done: 'appointments.completed',
    title: 'appointments.complete',
    variant: 'secondary',
  },
  'no-show': {
    label: 'appointments.noShow',
    done: 'appointments.noShowDone',
    title: 'appointments.noShow',
    variant: 'outline',
  },
  cancel: {
    label: 'appointments.cancel',
    done: 'appointments.cancelled',
    title: 'appointments.doctorCancelTitle',
    variant: 'destructive',
    reasonRequired: true,
  },
};

/**
 * Status actions for a clinic appointment (POST /clinics/{clinic}/appointments/{id}/{action}).
 * Hidden without clinic.appointments.manage; the API validates every transition.
 */
export function ClinicAppointmentActions({
  appointment,
  compact = false,
}: {
  appointment: Appointment;
  compact?: boolean;
}) {
  const t = useT();
  const { clinicId, can } = useClinic();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<AppointmentAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ act, reason }: { act: AppointmentAction; reason: string }) =>
      clinicApi.transition(clinicId, appointment.id, act, reason || undefined),
    onSuccess: ({ message }, { act }) => {
      toast.success(message || t(ACTIONS[act].done));
      setAction(null);
      queryClient.invalidateQueries({ queryKey: clinicKeys.of(clinicId, 'appointments') });
      queryClient.invalidateQueries({
        queryKey: clinicKeys.of(clinicId, 'appointment', appointment.id),
      });
      queryClient.invalidateQueries({ queryKey: clinicKeys.of(clinicId, 'reports') });
    },
    onError: (e) => setError(errorMessage(e, t)),
  });

  if (!can(CLINIC_PERMISSIONS.manageAppointments)) return null;
  const actions = availableDoctorActions(appointment);
  if (actions.length === 0) return null;
  const cfg = action ? ACTIONS[action] : null;

  return (
    <>
      {actions.map((act) => (
        <Button
          key={act}
          size="sm"
          variant={ACTIONS[act].variant}
          className={compact ? 'px-3 text-xs' : undefined}
          onClick={() => {
            setError(null);
            setAction(act);
          }}
        >
          {t(ACTIONS[act].label)}
        </Button>
      ))}
      {cfg && action && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setAction(null)}
          title={t(cfg.title)}
          description={
            action === 'cancel'
              ? t('clinic.appointments.cancelBody')
              : `${appointment.patient?.name ?? ''} — ${appointment.reference}`
          }
          confirmLabel={t(cfg.label)}
          destructive={cfg.variant === 'destructive'}
          pending={mutation.isPending}
          error={error}
          reason={
            cfg.reasonRequired
              ? {
                  label: t('common.reason'),
                  placeholder: t('clinic.extra.reasonPlaceholder'),
                  required: true,
                }
              : undefined
          }
          onConfirm={(reason) => {
            setError(null);
            mutation.mutate({ act: action, reason });
          }}
        />
      )}
    </>
  );
}

/** Full appointment (incl. status history) from the clinic endpoint, in a dialog. */
export function ClinicAppointmentDialog({
  appointmentId,
  onClose,
}: {
  appointmentId: string | null;
  onClose: () => void;
}) {
  const t = useT();
  const { clinicId } = useClinic();
  const query = useQuery({
    queryKey: clinicKeys.of(clinicId, 'appointment', appointmentId),
    queryFn: () => clinicApi.appointment(clinicId, appointmentId!),
    enabled: !!appointmentId,
  });

  return (
    <Dialog open={!!appointmentId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogTitle className="sr-only">{t('common.details')}</DialogTitle>
        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <AppointmentDetails
            appointment={query.data}
            perspective="doctor"
            actions={<ClinicAppointmentActions appointment={query.data} />}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
