'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, GitBranch, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Branch } from '@/types/api';
import { CLINIC_PERMISSIONS as P } from '../../types';
import { BranchFormDialog } from '../BranchDialogs';
import { BranchHoursDialog } from '../BranchHoursDialog';
import { BranchHoursList } from '../BranchHoursList';
import { useClinic } from '../ClinicContext';
import { useClinicBranches } from '../../hooks/useClinicData';
import { clinicApi } from '../../api';
import { clinicKeys } from '../../hooks/keys';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pager, useClientPage } from '@/components/shared/ClientPager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { errorMessage } from '@/lib/api/errors';
import { useFormat, useT } from '@/i18n/provider';

export function BranchesScreen() {
  const t = useT();
  const f = useFormat();
  const queryClient = useQueryClient();
  const { clinicId, can } = useClinic();
  const manage = can(P.manageBranches);
  const branches = useClinicBranches(clinicId);
  const [editing, setEditing] = useState<Branch | 'new' | null>(null);
  const [hoursFor, setHoursFor] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState<Branch | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { pageItems, meta, setPage } = useClientPage(branches.data, 8);

  const remove = useMutation({
    mutationFn: (id: string) => clinicApi.deleteBranch(clinicId, id),
    onSuccess: () => {
      toast.success(t('common.deleted'));
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: clinicKeys.of(clinicId, 'branches') });
    },
    onError: (e) => setDeleteError(errorMessage(e, t)),
  });

  const addButton = manage && (
    <Button onClick={() => setEditing('new')}>
      <Plus aria-hidden />
      {t('clinic.branches.add')}
    </Button>
  );

  return (
    <>
      <PageHeader
        title={t('clinic.branches.title')}
        description={t('clinic.branches.subtitle')}
        actions={addButton}
      />
      {!manage && (
        <p className="rounded-xl border border-dashed bg-card px-4 py-2.5 text-sm text-muted-foreground">
          {t('clinic.dash.readOnly')}
        </p>
      )}

      {branches.isPending ? (
        <LoadingState rows={2} />
      ) : branches.isError ? (
        <ErrorState error={branches.error} onRetry={() => branches.refetch()} />
      ) : branches.data.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title={t('clinic.branches.empty')}
          description={t('clinic.branches.emptyHint')}
          action={addButton || undefined}
        />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            {pageItems.map((b) => {
              const place = [f.l(b.area), f.l(b.city), f.l(b.governorate)]
                .filter(Boolean)
                .join('، ');
              return (
                <Card
                  key={b.id}
                  data-testid="branch-card"
                  className="transition-shadow duration-150 hover:shadow-md hover:shadow-slate-900/5 motion-reduce:transition-none"
                >
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <h2 className="text-lg font-semibold">{f.l(b)}</h2>
                        <Badge variant={b.is_active ? 'success' : 'muted'}>
                          {b.is_active
                            ? t('clinic.branches.active')
                            : t('clinic.branches.inactive')}
                        </Badge>
                      </div>
                      {manage && (
                        <div className="flex gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t('clinic.branches.edit')}
                            onClick={() => setEditing(b)}
                          >
                            <Pencil aria-hidden />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t('common.delete')}
                            onClick={() => {
                              setDeleteError(null);
                              setDeleting(b);
                            }}
                          >
                            <Trash2 className="text-destructive" aria-hidden />
                          </Button>
                        </div>
                      )}
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                        {[f.l(b, 'address'), place].filter(Boolean).join(' — ')}
                      </li>
                      {b.phone && (
                        <li className="flex items-center gap-2">
                          <Phone className="size-4 shrink-0" aria-hidden />
                          <span dir="ltr">{b.phone}</span>
                        </li>
                      )}
                    </ul>
                    <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <Clock className="size-4" aria-hidden />
                          {t('clinic.branches.hours')}
                        </p>
                        {manage && (
                          <Button size="sm" variant="outline" onClick={() => setHoursFor(b)}>
                            {t('clinic.branches.editHours')}
                          </Button>
                        )}
                      </div>
                      <BranchHoursList hours={b.hours} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Pager meta={meta} onPageChange={setPage} className="rounded-xl border bg-card" />
        </>
      )}

      {editing && (
        <BranchFormDialog
          branch={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {hoursFor && <BranchHoursDialog branch={hoursFor} onClose={() => setHoursFor(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('clinic.branches.deleteTitle')}
        description={deleting ? `${f.l(deleting)} — ${t('clinic.branches.deleteBody')}` : undefined}
        confirmLabel={t('common.yesDelete')}
        destructive
        pending={remove.isPending}
        error={deleteError}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}
