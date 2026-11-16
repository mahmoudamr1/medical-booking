'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, MapPin, Pencil, Plus, Stethoscope, Trash2, Video } from 'lucide-react';
import { toast } from 'sonner';
import type { Service } from '@/types/api';
import { ServiceDialog } from '../ServiceDialog';
import { useDoctorBranches } from '../../hooks/useDoctorProfile';
import { doctorApi } from '../../api';
import { doctorKeys } from '../../hooks/keys';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api/errors';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

export function ServicesScreen() {
  const t = useT();
  const f = useFormat();
  const queryClient = useQueryClient();
  const services = useQuery({ queryKey: doctorKeys.services, queryFn: doctorApi.services });
  const branches = useDoctorBranches();
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => doctorApi.deleteService(id),
    onSuccess: () => {
      toast.success(t('common.deleted'));
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: doctorKeys.services });
    },
    onError: (e) => toast.error(errorMessage(e, t)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('doctorDash.servicesTitle')}
        description={t('doctorDash.servicesHint')}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden />
            {t('doctorDash.addService')}
          </Button>
        }
      />

      {services.isPending ? (
        <LoadingState rows={3} />
      ) : services.isError ? (
        <ErrorState error={services.error} onRetry={() => services.refetch()} />
      ) : services.data.length === 0 ? (
        <EmptyState
          icon={<Stethoscope />}
          title={t('doctorDash.noServices')}
          action={<Button onClick={() => setEditing('new')}>{t('doctorDash.addService')}</Button>}
        />
      ) : (
        <>
          {/* Phones/tablets: cards */}
          <ul className="grid gap-3 sm:grid-cols-2 lg:hidden" data-testid="services-cards">
            {services.data.map((s) => (
              <li
                key={s.id}
                className={cn('rounded-xl border bg-card p-4', !s.is_active && 'opacity-70')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{f.l(s)}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        {s.consultation_type === 'online' ? (
                          <Video className="size-3.5" aria-hidden />
                        ) : (
                          <MapPin className="size-3.5" aria-hidden />
                        )}
                        {t(`consultation.${s.consultation_type}`)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" aria-hidden />
                        {t('common.minutes', { count: f.number(s.duration_minutes) })}
                      </span>
                    </p>
                    {s.branch && (
                      <p className="mt-1 truncate text-sm text-muted-foreground">{f.l(s.branch)}</p>
                    )}
                  </div>
                  <Badge variant={s.is_active ? 'success' : 'muted'}>
                    {s.is_active ? t('doctorDash.active') : t('doctorDash.inactive')}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                  <span className="text-lg font-semibold text-emerald-700">{f.money(s.price)}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('common.edit')}
                      onClick={() => setEditing(s)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('common.delete')}
                      onClick={() => setDeleting(s)}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-xl border bg-card lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{t('booking.service')}</th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t('doctorDash.consultationType')}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">{t('doctorDash.branch')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('booking.duration')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('booking.price')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('common.status')}</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">{t('common.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {services.data.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{f.l(s)}</td>
                    <td className="px-4 py-3">{t(`consultation.${s.consultation_type}`)}</td>
                    <td className="max-w-56 truncate px-4 py-3">
                      {s.branch ? f.l(s.branch) : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {t('common.minutes', { count: f.number(s.duration_minutes) })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">{f.money(s.price)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.is_active ? 'success' : 'muted'}>
                        {s.is_active ? t('doctorDash.active') : t('doctorDash.inactive')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('common.edit')}
                          onClick={() => setEditing(s)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('common.delete')}
                          onClick={() => setDeleting(s)}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && (
        <ServiceDialog
          service={editing === 'new' ? null : editing}
          branches={branches.data ?? []}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('doctorDash.deleteServiceTitle')}
        description={t('doctorDash.deleteServiceBody')}
        confirmLabel={t('common.yesDelete')}
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}
