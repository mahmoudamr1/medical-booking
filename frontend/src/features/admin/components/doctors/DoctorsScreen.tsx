'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Stethoscope } from 'lucide-react';
import { adminApi } from '../../api';
import { adminKeys } from '../../hooks/keys';
import { DoctorSheet } from '../DoctorSheet';
import { FilterBar, SearchBox, useUrlFilters } from '../filters';
import { ListCard } from '../ListCard';
import { VerificationBadge } from '@/components/shared/StatusBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFormat, useT } from '@/i18n/provider';
import type { VerificationStatus } from '@/types/api';

const TABS = ['pending', 'approved', 'rejected', 'suspended', 'draft', 'all'] as const;
type Tab = (typeof TABS)[number];

export function DoctorsScreen() {
  const t = useT();
  const f = useFormat();
  const { values, set, page } = useUrlFilters(['status', 'q', 'doctor'] as const);
  const tab: Tab = (TABS as readonly string[]).includes(values.status)
    ? (values.status as Tab)
    : 'pending';

  const params = {
    verification_status: (tab === 'all' ? '' : tab) as VerificationStatus | '',
    q: values.q,
    page,
  };
  const list = useQuery({
    queryKey: [...adminKeys.doctors, 'list', params],
    queryFn: () => adminApi.doctors(params),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.doctors.title')} description={t('admin.doctors.subtitle')} />

      <Tabs value={tab} onValueChange={(v) => set({ status: v === 'pending' ? null : v })}>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList>
            {TABS.map((s) => (
              <TabsTrigger key={s} value={s} className="px-3">
                {s === 'all' ? t('admin.filters.all') : t(`verification.${s}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <FilterBar>
        <SearchBox
          value={values.q}
          onCommit={(q) => set({ q })}
          placeholder={t('admin.doctors.searchPlaceholder')}
        />
      </FilterBar>

      <ListCard
        query={list}
        cols={5}
        empty={
          tab === 'pending' && !values.q
            ? t('admin.doctors.emptyPending')
            : t('admin.doctors.empty')
        }
        emptyIcon={<Stethoscope aria-hidden />}
        onPageChange={(p) => set({ page: p })}
      >
        {(items) => (
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">{t('admin.doctors.columns.doctor')}</TableHead>
                <TableHead>{t('admin.doctors.columns.specialty')}</TableHead>
                <TableHead>{t('admin.doctors.columns.license')}</TableHead>
                <TableHead>{t('admin.doctors.columns.submitted')}</TableHead>
                <TableHead>{t('admin.doctors.columns.status')}</TableHead>
                <TableHead className="pe-4">
                  <span className="sr-only">{t('common.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d) => {
                const primary = d.specialties?.find((s) => s.is_primary) ?? d.specialties?.[0];
                return (
                  <TableRow key={d.id} data-testid={`doctor-row-${d.email}`}>
                    <TableCell className="ps-4">
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {d.email}
                      </p>
                    </TableCell>
                    <TableCell>{primary ? f.l(primary) : '—'}</TableCell>
                    <TableCell>
                      <span dir="ltr" className="font-mono text-xs">
                        {d.license_number ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.verification_submitted_at
                        ? f.date(d.verification_submitted_at, undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <VerificationBadge status={d.verification_status} />
                    </TableCell>
                    <TableCell className="pe-4 text-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => set({ doctor: d.id, page })}
                      >
                        {t('admin.view')}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ListCard>

      <DoctorSheet doctorId={values.doctor || null} onClose={() => set({ doctor: null, page })} />
    </div>
  );
}
