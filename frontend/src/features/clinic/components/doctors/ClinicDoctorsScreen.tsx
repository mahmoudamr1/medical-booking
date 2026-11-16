'use client';

import { AffiliateDialog } from './AffiliateDialog';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link2, Stethoscope } from 'lucide-react';
import { CLINIC_PERMISSIONS as P, type ClinicAffiliation } from '../../types';
import { RequireClinicPermission, useClinic } from '../ClinicContext';
import { useClinicAffiliations, useClinicBranches } from '../../hooks/useClinicData';
import { clinicApi } from '../../api';
import { clinicKeys } from '../../hooks/keys';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ToneBadge, VerificationBadge } from '@/components/shared/StatusBadge';
import { ErrorState, LoadingState, Section } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pager, useClientPage } from '@/components/shared/ClientPager';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { errorMessage } from '@/lib/api/errors';
import { useFormat, useT } from '@/i18n/provider';

export function ClinicDoctorsScreen() {
  return (
    <RequireClinicPermission permission={P.viewSchedules}>
      <DoctorsView />
    </RequireClinicPermission>
  );
}

function DoctorsView() {
  const t = useT();
  const f = useFormat();
  const queryClient = useQueryClient();
  const { clinicId, can } = useClinic();
  const manage = can(P.manageDoctors);
  const query = useClinicAffiliations(clinicId);
  const branches = useClinicBranches(clinicId);
  const [adding, setAdding] = useState(false);
  const [showEnded, setShowEnded] = useState(false);
  const [ending, setEnding] = useState<ClinicAffiliation | null>(null);
  const [endError, setEndError] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: clinicKeys.of(clinicId, 'doctors') });
    queryClient.invalidateQueries({ queryKey: clinicKeys.of(clinicId, 'services') });
    queryClient.invalidateQueries({ queryKey: clinicKeys.of(clinicId, 'schedules') });
  };

  const end = useMutation({
    mutationFn: (id: string) => clinicApi.endAffiliation(clinicId, id),
    onSuccess: () => {
      toast.success(t('clinic.doctors.ended'));
      setEnding(null);
      invalidate();
    },
    onError: (e) => setEndError(errorMessage(e, t)),
  });

  const rows = (query.data ?? []).filter((a) => showEnded || a.status === 'active');
  const hasBranches = (branches.data?.length ?? 0) > 0;
  const { pageItems, meta, setPage } = useClientPage(rows, 15);

  return (
    <>
      <PageHeader
        title={t('clinic.doctors.title')}
        description={t('clinic.doctors.subtitle')}
        actions={
          manage && (
            <Button
              onClick={() => setAdding(true)}
              disabled={!hasBranches}
              title={hasBranches ? undefined : t('clinic.doctors.needBranch')}
            >
              <Link2 aria-hidden />
              {t('clinic.doctors.add')}
            </Button>
          )
        }
      />
      {manage && branches.isSuccess && !hasBranches && (
        <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {t('clinic.doctors.needBranch')}
        </p>
      )}

      {query.isPending ? (
        <LoadingState rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <Section
          actions={
            query.data.some((a) => a.status === 'ended') && (
              <CheckboxField
                id="show-ended"
                label={t('clinic.doctors.showEnded')}
                checked={showEnded}
                onChange={(e) => setShowEnded(e.target.checked)}
              />
            )
          }
        >
          {rows.length === 0 ? (
            <EmptyState
              compact
              icon={Stethoscope}
              title={t('clinic.doctors.empty')}
              description={t('clinic.doctors.emptyHint')}
            />
          ) : (
            <div className="-mx-(--card-spacing)">
              <Table className="min-w-[44rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t('clinic.doctors.doctor')}</TableHead>
                    <TableHead className="text-start">{t('clinic.doctors.branch')}</TableHead>
                    <TableHead className="text-start">{t('clinic.doctors.specialties')}</TableHead>
                    <TableHead className="text-start">{t('common.status')}</TableHead>
                    {manage && <TableHead className="text-end">{t('common.actions')}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <p className="font-medium">{a.doctor.name}</p>
                        {f.l(a.doctor, 'title') && (
                          <p className="text-xs text-muted-foreground">{f.l(a.doctor, 'title')}</p>
                        )}
                        <p className="text-xs text-muted-foreground" dir="ltr">
                          {a.doctor.email}
                        </p>
                      </TableCell>
                      <TableCell>{f.l(a.branch)}</TableCell>
                      <TableCell className="text-sm">
                        {a.doctor.specialties.map((s) => f.l(s)).join('، ') || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <ToneBadge tone={a.status === 'active' ? 'success' : 'muted'}>
                            {t(`clinic.doctors.status.${a.status}`)}
                          </ToneBadge>
                          {a.doctor.verification_status !== 'approved' && (
                            <VerificationBadge status={a.doctor.verification_status} />
                          )}
                        </div>
                      </TableCell>
                      {manage && (
                        <TableCell className="text-end">
                          {a.status === 'active' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setEndError(null);
                                setEnding(a);
                              }}
                            >
                              {t('clinic.doctors.end')}
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pager meta={meta} onPageChange={setPage} />
            </div>
          )}
        </Section>
      )}

      {adding && <AffiliateDialog onClose={() => setAdding(false)} onDone={invalidate} />}
      <ConfirmDialog
        open={!!ending}
        onOpenChange={(o) => !o && setEnding(null)}
        title={t('clinic.doctors.endTitle')}
        description={
          ending
            ? t('clinic.doctors.endBody', { name: ending.doctor.name, branch: f.l(ending.branch) })
            : undefined
        }
        confirmLabel={t('clinic.doctors.end')}
        destructive
        pending={end.isPending}
        error={endError}
        onConfirm={() => ending && end.mutate(ending.id)}
      />
    </>
  );
}
