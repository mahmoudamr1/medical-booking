'use client';

import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Ban, Building2, CalendarDays, RotateCcw } from 'lucide-react';
import { adminApi } from '../../api';
import { adminKeys } from '../../hooks/keys';
import { ClinicStatusBadge } from '../badges';
import { FilterBar, SearchBox, SelectFilter, useUrlFilters } from '../filters';
import { ListCard } from '../ListCard';
import { useConfirmAction } from '../../hooks/useStatusAction';
import type { AdminClinic, ClinicStatus } from '../../types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFormat, useT } from '@/i18n/provider';

const STATUSES: ClinicStatus[] = ['active', 'suspended'];

export function ClinicsScreen() {
  const t = useT();
  const f = useFormat();
  const { values, set, page } = useUrlFilters(['q', 'status'] as const);

  const params = { q: values.q, status: values.status as ClinicStatus | '', page };
  const list = useQuery({
    queryKey: [...adminKeys.clinics, params],
    queryFn: () => adminApi.clinics(params),
    placeholderData: keepPreviousData,
  });

  const action = useConfirmAction<AdminClinic, ClinicStatus>(
    (c, status, reason) => adminApi.setClinicStatus(c.id, status, reason),
    [adminKeys.clinics, adminKeys.audit],
  );
  const suspending = action.target?.action === 'suspended';

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.clinics.title')} description={t('admin.clinics.subtitle')} />

      <FilterBar>
        <SearchBox
          value={values.q}
          onCommit={(q) => set({ q })}
          placeholder={t('admin.clinics.searchPlaceholder')}
        />
        <SelectFilter
          id="clinics-status"
          label={t('admin.filters.status')}
          value={values.status}
          onChange={(status) => set({ status })}
          allLabel={t('admin.filters.all')}
          options={STATUSES.map((s) => ({ value: s, label: t(`admin.clinics.status.${s}`) }))}
        />
      </FilterBar>

      <ListCard
        query={list}
        cols={5}
        empty={t('admin.clinics.empty')}
        emptyIcon={<Building2 aria-hidden />}
        onPageChange={(p) => set({ page: p })}
      >
        {(items) => (
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">{t('admin.clinics.columns.clinic')}</TableHead>
                <TableHead>{t('admin.clinics.columns.owner')}</TableHead>
                <TableHead>{t('admin.clinics.columns.type')}</TableHead>
                <TableHead>{t('admin.clinics.columns.counts')}</TableHead>
                <TableHead>{t('admin.clinics.columns.status')}</TableHead>
                <TableHead>{t('admin.clinics.columns.created')}</TableHead>
                <TableHead className="pe-4">
                  <span className="sr-only">{t('common.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="ps-4">
                    <p className="font-medium">{f.l(c)}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {c.slug}
                    </p>
                  </TableCell>
                  <TableCell>
                    {c.owner ? (
                      <>
                        <p>{c.owner.name}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">
                          {c.owner.email}
                        </p>
                      </>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.is_personal_practice ? 'muted' : 'info'}>
                      {c.is_personal_practice
                        ? t('admin.clinics.personal')
                        : t('admin.clinics.center')}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {[c.branches_count, c.staff_count, c.doctors_count]
                      .map((n) => f.number(n))
                      .join(' / ')}
                  </TableCell>
                  <TableCell>
                    <ClinicStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.created_at
                      ? f.date(c.created_at, undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="pe-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/dashboard/admin/appointments?clinic=${c.id}`}
                        className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                        aria-label={t('admin.nav.appointments')}
                        title={t('admin.nav.appointments')}
                      >
                        <CalendarDays aria-hidden />
                      </Link>
                      {c.status === 'active' ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => action.open(c, 'suspended')}
                        >
                          <Ban aria-hidden />
                          {t('admin.clinics.suspend')}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => action.open(c, 'active')}
                        >
                          <RotateCcw aria-hidden />
                          {t('admin.clinics.reactivate')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListCard>

      <ConfirmDialog
        open={!!action.target}
        onOpenChange={(o) => !o && action.close()}
        title={
          action.target
            ? t(suspending ? 'admin.clinics.suspendTitle' : 'admin.clinics.reactivateTitle', {
                name: f.l(action.target.item),
              })
            : ''
        }
        description={
          suspending ? t('admin.clinics.suspendBody') : t('admin.clinics.reactivateBody')
        }
        confirmLabel={suspending ? t('admin.clinics.suspend') : t('admin.clinics.reactivate')}
        destructive={suspending}
        pending={action.pending}
        error={action.error}
        reason={{ label: t('admin.reasonOptional'), placeholder: t('admin.reasonPlaceholder') }}
        onConfirm={action.confirm}
      />
    </div>
  );
}
