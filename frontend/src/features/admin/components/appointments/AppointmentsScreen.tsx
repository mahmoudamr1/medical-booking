'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { adminApi } from '../../api';
import { adminKeys } from '../../hooks/keys';
import { AppointmentSheet } from '../AppointmentSheet';
import {
  DateFilter,
  FilterBar,
  FilterChip,
  SearchBox,
  SelectFilter,
  nextDay,
  useUrlFilters,
} from '../filters';
import { ListCard } from '../ListCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
import { useFormat, useT } from '@/i18n/provider';
import type { AppointmentStatus } from '@/types/api';

const STATUSES: AppointmentStatus[] = [
  'pending_confirmation',
  'confirmed',
  'completed',
  'cancelled_by_patient',
  'cancelled_by_doctor',
  'cancelled_by_clinic',
  'cancelled_by_admin',
  'rejected',
  'expired',
  'no_show',
];

export function AppointmentsScreen() {
  const t = useT();
  const f = useFormat();
  const { values, set, page } = useUrlFilters([
    'status',
    'q',
    'from',
    'to',
    'doctor',
    'clinic',
    'appointment',
  ] as const);

  const params = {
    status: values.status,
    q: values.q,
    from: values.from,
    to: values.to ? nextDay(values.to) : '',
    doctor_id: values.doctor,
    clinic_id: values.clinic,
    page,
  };
  const list = useQuery({
    queryKey: [...adminKeys.appointments, 'list', params],
    queryFn: () => adminApi.appointments(params),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('admin.appointments.title')}
        description={t('admin.appointments.subtitle')}
      />

      <FilterBar>
        <SearchBox
          value={values.q}
          onCommit={(q) => set({ q })}
          placeholder={t('admin.appointments.searchPlaceholder')}
          className="basis-44"
        />
        <SelectFilter
          id="appt-status"
          label={t('admin.filters.status')}
          value={values.status}
          onChange={(status) => set({ status })}
          allLabel={t('admin.filters.all')}
          options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
        />
        <DateFilter
          id="appt-from"
          label={t('admin.filters.from')}
          value={values.from}
          onChange={(from) => set({ from })}
        />
        <DateFilter
          id="appt-to"
          label={t('admin.filters.to')}
          value={values.to}
          min={values.from || undefined}
          onChange={(to) => set({ to })}
        />
        {(values.doctor || values.clinic) && (
          <div className="flex basis-full flex-wrap gap-2">
            {values.doctor && (
              <FilterChip
                label={t('admin.appointments.filteredByDoctor')}
                onRemove={() => set({ doctor: null })}
              />
            )}
            {values.clinic && (
              <FilterChip
                label={t('admin.appointments.filteredByClinic')}
                onRemove={() => set({ clinic: null })}
              />
            )}
          </div>
        )}
      </FilterBar>

      <ListCard
        query={list}
        cols={6}
        empty={t('admin.appointments.empty')}
        emptyIcon={<CalendarDays aria-hidden />}
        onPageChange={(p) => set({ page: p })}
      >
        {(items) => (
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">{t('admin.appointments.columns.reference')}</TableHead>
                <TableHead>{t('admin.appointments.columns.patient')}</TableHead>
                <TableHead>{t('admin.appointments.columns.doctor')}</TableHead>
                <TableHead>{t('admin.appointments.columns.when')}</TableHead>
                <TableHead>{t('admin.appointments.columns.status')}</TableHead>
                <TableHead>{t('admin.appointments.columns.price')}</TableHead>
                <TableHead className="pe-4">
                  <span className="sr-only">{t('common.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="ps-4 font-mono text-xs" dir="ltr">
                    {a.reference}
                  </TableCell>
                  <TableCell>{a.patient?.name ?? '—'}</TableCell>
                  <TableCell>{a.doctor?.name ?? '—'}</TableCell>
                  <TableCell>{f.dateTime(a.starts_at, a.timezone ?? undefined)}</TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="tabular-nums">{f.money(a.price)}</TableCell>
                  <TableCell className="pe-4 text-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => set({ appointment: a.id, page })}
                    >
                      {t('admin.view')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListCard>

      <AppointmentSheet
        appointmentId={values.appointment || null}
        onClose={() => set({ appointment: null, page })}
      />
    </div>
  );
}
