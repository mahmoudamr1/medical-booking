'use client';

import { AdminSheet } from './AdminSheet';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarX } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../api';
import { adminKeys } from '../hooks/keys';
import { DetailList } from './DetailList';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BUSINESS_TZ } from '@/i18n/format';
import { useFormat, useI18n } from '@/i18n/provider';
import { errorMessage } from '@/lib/api/errors';
import type { AppointmentStatus } from '@/types/api';

const CANCELLABLE: AppointmentStatus[] = ['pending_confirmation', 'confirmed'];
const ACTORS = ['patient', 'doctor', 'clinic', 'admin', 'system'] as const;

export function AppointmentSheet({
  appointmentId,
  onClose,
}: {
  appointmentId: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <AdminSheet
      open={!!appointmentId}
      onClose={onClose}
      title={t('admin.appointments.detailsTitle')}
    >
      {appointmentId && <Detail id={appointmentId} />}
    </AdminSheet>
  );
}

function Detail({ id }: { id: string }) {
  const { t } = useI18n();
  const f = useFormat();
  const queryClient = useQueryClient();
  const key = [...adminKeys.appointments, 'detail', id];
  const appt = useQuery({ queryKey: key, queryFn: () => adminApi.appointment(id) });
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = useMutation({
    mutationFn: (reason: string) => adminApi.cancelAppointment(id, reason),
    onSuccess: (res) => {
      toast.success(res.message || t('admin.done'));
      queryClient.setQueryData(key, res.data);
      queryClient.invalidateQueries({ queryKey: adminKeys.appointments });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats });
      setConfirming(false);
    },
    onError: (e) => setError(errorMessage(e, t)),
  });

  if (appt.isPending || appt.isError) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>{t('admin.appointments.detailsTitle')}</SheetTitle>
        </SheetHeader>
        {appt.isPending ? (
          <LoadingState />
        ) : (
          <div className="p-4">
            <ErrorState error={appt.error} onRetry={() => appt.refetch()} />
          </div>
        )}
      </>
    );
  }

  const a = appt.data;
  const tz = a.timezone ?? BUSINESS_TZ;
  const specialty = a.doctor?.specialties?.find((s) => s.is_primary) ?? a.doctor?.specialties?.[0];
  const place =
    a.consultation_type === 'online'
      ? t('common.online')
      : [f.l(a.branch?.clinic), f.l(a.branch), f.l(a.branch, 'address')]
          .filter(Boolean)
          .join(' – ');

  return (
    <>
      <SheetHeader className="gap-2 border-b pe-12">
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle className="font-mono text-lg" dir="ltr">
            {a.reference}
          </SheetTitle>
          <StatusBadge status={a.status} />
        </div>
        <SheetDescription>{t('admin.appointments.detailsTitle')}</SheetDescription>
      </SheetHeader>
      <div className="space-y-6 p-4">
        <DetailList
          rows={[
            [
              t('appointments.patient'),
              [a.patient?.name, a.patient?.phone, a.patient?.email].filter(Boolean).join(' · '),
            ],
            [
              t('appointments.doctor'),
              [a.doctor?.name, f.l(a.doctor, 'title')].filter(Boolean).join(' – '),
            ],
            [t('appointments.specialty'), specialty ? f.l(specialty) : null],
            [t('booking.service'), f.l(a.service)],
            [t('appointments.type'), t(`consultation.${a.consultation_type}`)],
            [t('appointments.clinic'), place],
            [t('appointments.date'), f.date(a.starts_at, tz)],
            [t('appointments.time'), `${f.time(a.starts_at, tz)} – ${f.time(a.ends_at, tz)}`],
            [t('appointments.price'), f.money(a.price)],
            [t('appointments.createdAt'), a.created_at ? f.dateTime(a.created_at, tz) : null],
            [t('appointments.notes'), a.patient_notes],
            [t('appointments.cancellationReason'), a.cancellation_reason],
          ]}
        />

        {CANCELLABLE.includes(a.status) && (
          <Button
            variant="destructive"
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
          >
            <CalendarX aria-hidden />
            {t('admin.appointments.cancel')}
          </Button>
        )}

        {!!a.history?.length && (
          <>
            <Separator />
            <section className="space-y-3">
              <h3 className="font-semibold">{t('appointments.history')}</h3>
              <ol className="relative space-y-4 border-s ps-4">
                {a.history.map((h, i) => (
                  <li key={i} className="relative">
                    <span
                      className="absolute -start-[1.32rem] top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-background"
                      aria-hidden
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={h.to} />
                      <span className="text-xs text-muted-foreground">{f.dateTime(h.at, tz)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('appointments.historyBy', {
                        role: (ACTORS as readonly string[]).includes(h.actor_role)
                          ? t(`appointments.actor.${h.actor_role as (typeof ACTORS)[number]}`)
                          : h.actor_role,
                      })}
                    </p>
                    {h.reason && <p className="mt-1 text-sm">{h.reason}</p>}
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('admin.appointments.cancelTitle', { reference: a.reference })}
        description={t('admin.appointments.cancelBody')}
        confirmLabel={t('admin.appointments.cancel')}
        destructive
        pending={cancel.isPending}
        error={error}
        reason={{
          label: t('admin.reasonRequired'),
          placeholder: t('admin.reasonPlaceholder'),
          required: true,
        }}
        onConfirm={(reason) => cancel.mutate(reason)}
      />
    </>
  );
}
