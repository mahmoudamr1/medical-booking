'use client';

import { SpecialtyDialog } from './SpecialtyDialog';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Tags } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../api';
import { adminKeys } from '../../hooks/keys';
import { TableSkeleton } from '../ListCard';
import { SpecialtiesTable } from '../SpecialtiesTable';
import type { AdminSpecialty } from '../../types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useFormat, useT } from '@/i18n/provider';
import { errorMessage } from '@/lib/api/errors';
import { directoryKeys } from '@/features/directory';

export function SpecialtiesScreen() {
  const t = useT();
  const f = useFormat();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: adminKeys.specialties, queryFn: adminApi.specialties });
  const [editing, setEditing] = useState<AdminSpecialty | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminSpecialty | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.specialties });
    queryClient.invalidateQueries({ queryKey: directoryKeys.all });
  };

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteSpecialty(id),
    onSuccess: () => {
      toast.success(t('common.deleted'));
      setDeleting(null);
      invalidate();
    },
    // 409 specialty_in_use → localized message from the API, shown in the dialog.
    onError: (e) => setDeleteError(errorMessage(e, t)),
  });

  const deactivate = useMutation({
    mutationFn: (s: AdminSpecialty) => adminApi.updateSpecialty(s.id, { is_active: false }),
    onSuccess: (res) => {
      toast.success(res.message || t('common.saved'));
      setDeleting(null);
      invalidate();
    },
    onError: (e) => setDeleteError(errorMessage(e, t)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('admin.specialties.title')}
        description={t('admin.specialties.subtitle')}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden />
            {t('admin.specialties.add')}
          </Button>
        }
      />

      {list.isPending ? (
        <Card className="py-0">
          <TableSkeleton cols={5} />
        </Card>
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.data.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={t('admin.specialties.empty')}
          action={<Button onClick={() => setEditing('new')}>{t('admin.specialties.add')}</Button>}
        />
      ) : (
        <SpecialtiesTable
          items={list.data}
          onEdit={setEditing}
          onDelete={(sp) => {
            setDeleteError(null);
            setDeleting(sp);
          }}
        />
      )}

      {editing && (
        <SpecialtyDialog
          specialty={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={invalidate}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && !deactivate.isPending && setDeleting(null)}
        title={t('admin.specialties.deleteTitle')}
        description={
          deleting ? (
            <>
              <strong>{f.l(deleting)}</strong> — {t('admin.specialties.deleteBody')}
            </>
          ) : undefined
        }
        confirmLabel={t('common.yesDelete')}
        destructive
        pending={remove.isPending || deactivate.isPending}
        error={deleteError}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      >
        {deleteError && deleting?.is_active && (
          <Button
            variant="outline"
            onClick={() => deactivate.mutate(deleting)}
            disabled={deactivate.isPending}
          >
            {t('admin.specialties.deactivateInstead')}
          </Button>
        )}
      </ConfirmDialog>
    </div>
  );
}
