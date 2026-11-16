'use client';

import { InviteDialog } from './InviteDialog';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Lock, UserPlus, Users } from 'lucide-react';
import { CLINIC_PERMISSIONS as P, type StaffMember, type StaffRole } from '../../types';
import { RequireClinicPermission, useClinic } from '../ClinicContext';
import { roleKey } from '../ClinicSwitcher';
import { clinicApi } from '../../api';
import { clinicKeys } from '../../hooks/keys';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ToneBadge } from '@/components/shared/StatusBadge';
import { ErrorState, LoadingState, Section } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pager, useClientPage } from '@/components/shared/ClientPager';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { errorMessage } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useFormat, useT } from '@/i18n/provider';

export const STAFF_ROLES: StaffRole[] = ['manager', 'receptionist'];
const STATUS_TONE = { invited: 'warning', active: 'success', suspended: 'danger' } as const;

export function StaffScreen() {
  return (
    <RequireClinicPermission permission={P.manageStaff}>
      <StaffView />
    </RequireClinicPermission>
  );
}

function StaffView() {
  const t = useT();
  const f = useFormat();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { clinicId } = useClinic();
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<StaffMember | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: clinicKeys.of(clinicId, 'staff'),
    queryFn: () => clinicApi.staff(clinicId),
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: clinicKeys.of(clinicId, 'staff') });
  const { pageItems, meta, setPage } = useClientPage(query.data, 15);

  const update = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { role?: StaffRole; status?: 'active' | 'suspended' };
    }) => clinicApi.updateStaff(clinicId, id, body),
    onSuccess: () => {
      toast.success(t('clinic.staff.updated'));
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e, t)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => clinicApi.removeStaff(clinicId, id),
    onSuccess: () => {
      toast.success(t('clinic.staff.removed'));
      setRemoving(null);
      invalidate();
    },
    onError: (e) => setRemoveError(errorMessage(e, t)),
  });

  return (
    <>
      <PageHeader
        title={t('clinic.staff.title')}
        description={t('clinic.staff.subtitle')}
        actions={
          <Button onClick={() => setInviting(true)}>
            <UserPlus aria-hidden />
            {t('clinic.staff.invite')}
          </Button>
        }
      />
      {query.isPending ? (
        <LoadingState rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState icon={Users} title={t('clinic.staff.empty')} />
      ) : (
        <Section>
          <div className="-mx-(--card-spacing)">
            <Table className="min-w-[46rem]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t('clinic.staff.member')}</TableHead>
                  <TableHead className="text-start">{t('clinic.staff.role')}</TableHead>
                  <TableHead className="text-start">{t('common.status')}</TableHead>
                  <TableHead className="text-start">{t('clinic.staff.joined')}</TableHead>
                  <TableHead className="text-end">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((m) => {
                  const owner = m.role === 'owner';
                  const busy = update.isPending && update.variables?.id === m.id;
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <p className="font-medium">
                          {m.user?.name ?? '—'}
                          {m.user?.id === user?.id && (
                            <span className="ms-1 text-xs text-muted-foreground">
                              ({t('clinic.staff.you')})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground" dir="ltr">
                          {m.user?.email}
                        </p>
                      </TableCell>
                      <TableCell>
                        {owner ? (
                          <span className="inline-flex items-center gap-1 text-sm">
                            <Lock
                              className="size-3.5 text-muted-foreground"
                              aria-label={t('clinic.staff.ownerLocked')}
                            />
                            {t(roleKey(m.role))}
                          </span>
                        ) : (
                          <NativeSelect
                            aria-label={`${t('clinic.staff.role')} — ${m.user?.name ?? ''}`}
                            className="h-9 w-40"
                            value={m.role}
                            disabled={busy}
                            onChange={(e) =>
                              update.mutate({
                                id: m.id,
                                body: { role: e.target.value as StaffRole },
                              })
                            }
                          >
                            {STAFF_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {t(roleKey(r))}
                              </option>
                            ))}
                          </NativeSelect>
                        )}
                      </TableCell>
                      <TableCell>
                        <ToneBadge tone={STATUS_TONE[m.status]}>
                          {t(`clinic.staff.status.${m.status}`)}
                        </ToneBadge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.joined_at
                          ? f.date(m.joined_at, undefined, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {owner ? (
                          <p className="text-end text-xs text-muted-foreground">
                            {t('clinic.staff.ownerLocked')}
                          </p>
                        ) : (
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {m.status === 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                  update.mutate({ id: m.id, body: { status: 'suspended' } })
                                }
                              >
                                {t('clinic.staff.suspend')}
                              </Button>
                            )}
                            {m.status === 'suspended' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                  update.mutate({ id: m.id, body: { status: 'active' } })
                                }
                              >
                                {t('clinic.staff.reactivate')}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setRemoveError(null);
                                setRemoving(m);
                              }}
                            >
                              {m.status === 'invited'
                                ? t('clinic.staff.cancelInvite')
                                : t('clinic.staff.remove')}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pager meta={meta} onPageChange={setPage} />
          </div>
        </Section>
      )}

      {inviting && <InviteDialog onClose={() => setInviting(false)} onInvited={invalidate} />}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={t('clinic.staff.removeTitle')}
        description={
          removing ? t('clinic.staff.removeBody', { name: removing.user?.name ?? '' }) : undefined
        }
        confirmLabel={t('clinic.staff.remove')}
        destructive
        pending={remove.isPending}
        error={removeError}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </>
  );
}
