'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Appointment, AppointmentAction } from '@/types/api';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AppointmentDetails, appointmentsApi, appointmentKeys } from '@/features/appointments';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { DetailSheet } from '@/components/shared/DetailSheet';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api/errors';
import { useT } from '@/i18n/provider';
import type { TranslationKey } from '@/i18n/translate';
import { doctorKeys } from '../hooks/keys';

interface ActionConfig {
  label: TranslationKey;
  done: TranslationKey;
  title: TranslationKey;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  reason?: 'required';
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
    reason: 'required',
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
    reason: 'required',
  },
};

/** Actions offered for the current state (the API still validates every transition). */
export function availableDoctorActions(a: Appointment, now = Date.now()): AppointmentAction[] {
  const started = new Date(a.starts_at).getTime() <= now;
  if (a.status === 'pending_confirmation')
    return started ? ['reject'] : ['confirm', 'reject', 'cancel'];
  if (a.status === 'confirmed') return started ? ['complete', 'no-show'] : ['cancel'];
  return [];
}

export function DoctorAppointmentActions({
  appointment,
  compact = false,
  only,
  quickConfirm = false,
  onDone,
}: {
  appointment: Appointment;
  compact?: boolean;
  /** Restrict the offered actions (e.g. quick confirm/reject in the pending panel). */
  only?: AppointmentAction[];
  /** Confirm immediately without the confirmation dialog. */
  quickConfirm?: boolean;
  onDone?: (act: AppointmentAction) => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<AppointmentAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actions = availableDoctorActions(appointment).filter((a) => !only || only.includes(a));

  const mutation = useMutation({
    mutationFn: ({ act, reason }: { act: AppointmentAction; reason: string }) =>
      appointmentsApi.transition(appointment.id, act, reason || undefined),
    onSuccess: ({ message }, { act }) => {
      toast.success(message || t(ACTIONS[act].done));
      setAction(null);
      queryClient.invalidateQueries({ queryKey: doctorKeys.all });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointment.id) });
      onDone?.(act);
    },
    onError: (e, { act }) => {
      // Quick actions have no dialog to show the error in.
      if (!action && act === 'confirm') toast.error(errorMessage(e, t));
      else setError(errorMessage(e, t));
    },
  });

  if (actions.length === 0) return null;
  const cfg = action ? ACTIONS[action] : null;

  return (
    <>
      {actions.map((act) => (
        <Button
          key={act}
          size="sm"
          variant={ACTIONS[act].variant}
          className={compact ? 'h-10 px-3 text-xs sm:h-8' : undefined}
          disabled={mutation.isPending}
          data-action={act}
          onClick={() => {
            setError(null);
            if (quickConfirm && act === 'confirm') {
              mutation.mutate({ act, reason: '' });
              return;
            }
            setAction(act);
          }}
        >
          {quickConfirm && act === 'confirm' && mutation.isPending && !action
            ? t('common.saving')
            : t(ACTIONS[act].label)}
        </Button>
      ))}
      {cfg && action && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setAction(null)}
          title={t(cfg.title)}
          description={
            action === 'cancel'
              ? t('appointments.doctorCancelBody')
              : `${appointment.patient?.name ?? ''} — ${appointment.reference}`
          }
          confirmLabel={t(cfg.label)}
          destructive={cfg.variant === 'destructive'}
          pending={mutation.isPending}
          error={error}
          reason={
            cfg.reason
              ? {
                  label: t('common.reason'),
                  placeholder: t('appointments.rejectReasonPlaceholder'),
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

/** Full appointment (incl. history) for the doctor, in a side sheet with every allowed action. */
export function DoctorAppointmentSheet({
  appointmentId,
  onClose,
}: {
  appointmentId: string | null;
  onClose: () => void;
}) {
  const t = useT();
  const query = useQuery({
    queryKey: appointmentKeys.detail(appointmentId),
    queryFn: () => appointmentsApi.show(appointmentId!),
    enabled: !!appointmentId,
  });
  const ready = !!appointmentId && query.isSuccess;
  return (
    <DetailSheet
      open={!!appointmentId}
      onOpenChange={(o) => !o && onClose()}
      title={t('doctorPanel.calendar.detailsTitle')}
      description={ready ? query.data.reference : undefined}
      footer={
        ready && availableDoctorActions(query.data).length > 0 ? (
          <DoctorAppointmentActions appointment={query.data} />
        ) : undefined
      }
    >
      {query.isPending ? (
        <LoadingState rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <AppointmentDetails appointment={query.data} perspective="doctor" variant="sheet" />
      )}
    </DetailSheet>
  );
}
