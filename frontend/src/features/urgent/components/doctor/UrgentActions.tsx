'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { DoctorUrgentAction, UrgentRequest } from '../../types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { URGENT_KEYS } from '../../hooks/keys';
import { urgentApi } from '../../api';
import { isApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { useT } from '@/i18n/provider';
import type { TranslationKey } from '@/i18n/translate';
import { cn } from '@/lib/utils';

const OUTCOME_MAX = 2000;

/** Which actions the doctor may take now (the API still validates every transition). */
export function doctorUrgentActions(r: UrgentRequest): DoctorUrgentAction[] {
  if (
    (r.status === 'searching' || r.status === 'notifying') &&
    (r.my_dispatch_status ?? 'notified') === 'notified'
  )
    return ['accept', 'decline'];
  if (r.status === 'accepted') return ['start', 'complete', 'report'];
  if (r.status === 'in_progress') return ['complete', 'report'];
  return [];
}

const LABEL: Record<DoctorUrgentAction, TranslationKey> = {
  accept: 'doctorUrgent.requests.accept',
  decline: 'doctorUrgent.requests.decline',
  start: 'doctorUrgent.requests.start',
  complete: 'doctorUrgent.requests.complete',
  report: 'doctorUrgent.requests.report',
};
const TITLE: Record<DoctorUrgentAction, TranslationKey> = {
  accept: 'doctorUrgent.requests.acceptTitle',
  decline: 'doctorUrgent.requests.declineTitle',
  start: 'doctorUrgent.requests.startTitle',
  complete: 'doctorUrgent.requests.completeTitle',
  report: 'doctorUrgent.requests.reportTitle',
};
const VARIANT: Record<DoctorUrgentAction, 'default' | 'success' | 'ghost' | 'outline'> = {
  accept: 'default',
  start: 'default',
  complete: 'success',
  report: 'ghost',
  decline: 'outline',
};

/** Accept / decline / start / complete / report buttons with confirmation; 409 races refresh the lists. */
export function DoctorUrgentActions({ request }: { request: UrgentRequest }) {
  const t = useT();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<DoctorUrgentAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actions = doctorUrgentActions(request);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: URGENT_KEYS.doctorAll });
    queryClient.invalidateQueries({ queryKey: URGENT_KEYS.request(request.id) });
  };

  const mutation = useMutation({
    mutationFn: ({ act, reason }: { act: DoctorUrgentAction; reason?: string }) =>
      act === 'complete'
        ? urgentApi.complete(request.id, reason)
        : urgentApi.respond(request.id, act, reason),
    onSuccess: ({ data, message }) => {
      toast.success(message || t('doctorUrgent.requests.done'));
      setAction(null);
      queryClient.setQueryData(URGENT_KEYS.request(request.id), data);
      refresh();
    },
    onError: (e) => {
      if (
        isApiError(e) &&
        e.status === 409 &&
        (e.code === 'urgent_already_accepted' || e.code === 'urgent_not_available')
      ) {
        toast.warning(
          e.code === 'urgent_already_accepted'
            ? t('doctorUrgent.requests.alreadyAccepted')
            : e.message,
          { description: t('doctorUrgent.requests.refreshed') },
        );
        setAction(null);
        refresh();
        return;
      }
      setError(errorMessage(e, t));
    },
  });

  if (actions.length === 0) return null;

  return (
    <>
      {actions.map((act) => (
        <Button
          key={act}
          size="sm"
          variant={VARIANT[act]}
          className={cn(act === 'report' && 'text-destructive hover:text-destructive')}
          disabled={mutation.isPending}
          data-action={act}
          onClick={() => {
            setError(null);
            setAction(act);
          }}
        >
          {act === 'report' && <AlertTriangle aria-hidden />}
          {t(LABEL[act])}
        </Button>
      ))}
      {action && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setAction(null)}
          title={t(TITLE[action])}
          description={
            action === 'accept'
              ? t('doctorUrgent.requests.acceptBody')
              : action === 'report'
                ? t('doctorUrgent.requests.reportBody')
                : action === 'complete'
                  ? t('doctorUrgent.requests.outcomeHint')
                  : undefined
          }
          confirmLabel={t(LABEL[action])}
          destructive={action === 'report' || action === 'decline'}
          pending={mutation.isPending}
          error={error}
          reason={
            action === 'report'
              ? {
                  label: t('common.reason'),
                  required: true,
                  placeholder: t('doctorUrgent.requests.reportPlaceholder'),
                }
              : action === 'complete'
                ? {
                    label: t('doctorUrgent.requests.outcomeNote'),
                    placeholder: t('doctorUrgent.requests.outcomePlaceholder'),
                    maxLength: OUTCOME_MAX,
                  }
                : undefined
          }
          onConfirm={(reason) => {
            setError(null);
            if (action === 'report' && reason.length < 5) {
              setError(t('reviews.reasonMin'));
              return;
            }
            mutation.mutate({
              act: action,
              reason:
                action === 'report' || action === 'complete' ? reason || undefined : undefined,
            });
          }}
        />
      )}
    </>
  );
}
