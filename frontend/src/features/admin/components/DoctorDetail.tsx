'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Ban, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../api';
import { adminKeys } from '../hooks/keys';
import { DoctorProfileSections } from './DoctorProfileSections';
import type { DoctorDecision } from '../types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { VerificationBadge } from '@/components/shared/StatusBadge';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/provider';
import { errorMessage } from '@/lib/api/errors';
import type { VerificationStatus } from '@/types/api';

const ACTIONS: Record<VerificationStatus, DoctorDecision[]> = {
  pending: ['approve', 'reject', 'suspend'],
  approved: ['suspend'],
  suspended: ['reinstate'],
  draft: [],
  rejected: [],
};

const ACTION_ICON = { approve: BadgeCheck, reject: X, suspend: Ban, reinstate: RotateCcw } as const;

export function DoctorDetail({ id }: { id: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const doctor = useQuery({
    queryKey: [...adminKeys.doctors, 'detail', id],
    queryFn: () => adminApi.doctor(id),
  });
  const [pending, setPending] = useState<DoctorDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = useMutation({
    mutationFn: ({ decision, notes }: { decision: DoctorDecision; notes: string }) =>
      adminApi.decideDoctor(id, decision, notes),
    onSuccess: (res) => {
      toast.success(res.message || t('admin.done'));
      queryClient.setQueryData([...adminKeys.doctors, 'detail', id], res.data);
      queryClient.invalidateQueries({ queryKey: adminKeys.doctors });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats });
      setPending(null);
    },
    // 409 (invalid_transition / self_review) and 422 messages come localized from the API.
    onError: (e) => setError(errorMessage(e, t)),
  });

  if (doctor.isPending) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>{t('admin.doctors.profile')}</SheetTitle>
        </SheetHeader>
        <LoadingState />
      </>
    );
  }
  if (doctor.isError) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>{t('admin.doctors.profile')}</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <ErrorState error={doctor.error} onRetry={() => doctor.refetch()} />
        </div>
      </>
    );
  }

  const d = doctor.data;
  const actions = ACTIONS[d.verification_status] ?? [];
  const needsNotes = pending === 'reject' || pending === 'suspend';

  return (
    <>
      <SheetHeader className="gap-2 border-b pe-12">
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle className="text-lg">{d.name}</SheetTitle>
          <VerificationBadge status={d.verification_status} />
        </div>
        <SheetDescription dir="ltr" className="text-start">
          {d.email}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 p-4">
        <section className="space-y-3 rounded-xl bg-muted/50 p-4" aria-labelledby="doctor-decision">
          <div className="space-y-1">
            <h3 id="doctor-decision" className="font-semibold">
              {t('admin.doctors.decision')}
            </h3>
            <p className="text-xs text-muted-foreground">{t('admin.doctors.decisionHint')}</p>
          </div>
          {d.verification_notes && (
            <p className="rounded-lg bg-background p-3 text-sm ring-1 ring-foreground/10">
              <span className="block text-xs text-muted-foreground">
                {t('admin.doctors.notes')}
              </span>
              {d.verification_notes}
            </p>
          )}
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin.doctors.noActions')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => {
                const Icon = ACTION_ICON[a];
                return (
                  <Button
                    key={a}
                    size="sm"
                    variant={
                      a === 'approve' || a === 'reinstate'
                        ? 'success'
                        : a === 'reject'
                          ? 'danger'
                          : 'outline'
                    }
                    onClick={() => {
                      setError(null);
                      setPending(a);
                    }}
                  >
                    <Icon aria-hidden />
                    {t(`admin.doctors.actions.${a}`)}
                  </Button>
                );
              })}
            </div>
          )}
        </section>

        <DoctorProfileSections doctor={d} />
      </div>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending ? t(`admin.doctors.confirm.${pending}Title`) : ''}
        description={pending ? t(`admin.doctors.confirm.${pending}Body`) : undefined}
        confirmLabel={pending ? t(`admin.doctors.actions.${pending}`) : undefined}
        destructive={pending === 'reject' || pending === 'suspend'}
        pending={decide.isPending}
        error={error}
        reason={
          pending && pending !== 'reinstate'
            ? {
                label: needsNotes
                  ? t('admin.doctors.notesLabel')
                  : `${t('admin.doctors.notesLabel')} (${t('common.optional')})`,
                placeholder: t('admin.doctors.notesPlaceholder'),
                required: needsNotes,
              }
            : undefined
        }
        onConfirm={(notes) => pending && decide.mutate({ decision: pending, notes })}
      />
    </>
  );
}
