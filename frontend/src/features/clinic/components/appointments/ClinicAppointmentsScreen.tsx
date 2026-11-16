'use client';

import { useState, type FormEvent } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CalendarPlus, CalendarSearch, RotateCcw, Search } from 'lucide-react';
import type { AppointmentStatus } from '@/types/api';
import { CLINIC_PERMISSIONS as P } from '../../types';
import { BookOnBehalfDialog } from '../BookOnBehalfDialog';
import { ClinicAppointmentDialog } from '../ClinicAppointmentActions';
import { ClinicAppointmentsTable } from '../ClinicAppointmentsTable';
import { RequireClinicPermission, useClinic } from '../ClinicContext';
import { uniqueDoctors, useClinicAffiliations, useClinicBranches } from '../../hooks/useClinicData';
import { clinicApi } from '../../api';
import { clinicKeys } from '../../hooks/keys';
import { Pagination } from '@/components/shared/Pagination';
import { ErrorState, LoadingState, Section } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Field, NativeSelect } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { BUSINESS_TZ, addDaysToKey, todayKey, zonedDayStartIso } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

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

interface Filters {
  branch_id: string;
  doctor_id: string;
  status: string;
  from: string;
  to: string;
  q: string;
}

export function ClinicAppointmentsScreen() {
  return (
    <RequireClinicPermission permission={P.viewAppointments}>
      <AppointmentsView />
    </RequireClinicPermission>
  );
}

function AppointmentsView() {
  const t = useT();
  const f = useFormat();
  const { clinicId, can } = useClinic();
  const defaults: Filters = {
    branch_id: '',
    doctor_id: '',
    status: '',
    from: todayKey(BUSINESS_TZ),
    to: '',
    q: '',
  };
  const [draft, setDraft] = useState<Filters>(defaults);
  const [filters, setFilters] = useState<Filters>(defaults);
  const [page, setPage] = useState(1);
  const [booking, setBooking] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const branches = useClinicBranches(clinicId);
  const affiliations = useClinicAffiliations(clinicId, can(P.viewSchedules));
  const doctors = uniqueDoctors(affiliations.data, false);

  const query = useQuery({
    queryKey: clinicKeys.of(clinicId, 'appointments', filters, page),
    queryFn: () =>
      clinicApi.appointments(clinicId, {
        branch_id: filters.branch_id || undefined,
        doctor_id: filters.doctor_id || undefined,
        status: filters.status || undefined,
        // Dates are Cairo calendar days; `to` is inclusive in the UI.
        from: filters.from ? zonedDayStartIso(filters.from, BUSINESS_TZ) : undefined,
        to: filters.to ? zonedDayStartIso(addDaysToKey(filters.to, 1), BUSINESS_TZ) : undefined,
        q: filters.q.trim() || undefined,
        page,
        per_page: 20,
      }),
    placeholderData: keepPreviousData,
  });

  const apply = (next: Filters) => {
    setFilters(next);
    setPage(1);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    apply(draft);
  };
  const set = (k: keyof Filters) => (e: { target: { value: string } }) => {
    const next = { ...draft, [k]: e.target.value };
    setDraft(next);
    // Selects apply immediately; free-text and dates wait for the submit button.
    if (k === 'branch_id' || k === 'doctor_id' || k === 'status') apply(next);
  };

  return (
    <>
      <PageHeader
        title={t('clinic.appointments.title')}
        description={t('clinic.appointments.subtitle')}
        actions={
          can(P.bookAppointments) && (
            <Button onClick={() => setBooking(true)}>
              <CalendarPlus aria-hidden />
              {t('clinic.appointments.bookOnBehalf')}
            </Button>
          )
        }
      />

      <Section>
        <form
          onSubmit={onSubmit}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-label={t('clinic.appointments.filters')}
        >
          <Field label={t('clinic.appointments.branch')} htmlFor="f-branch">
            <NativeSelect id="f-branch" value={draft.branch_id} onChange={set('branch_id')}>
              <option value="">{t('common.all')}</option>
              {branches.data?.map((b) => (
                <option key={b.id} value={b.id}>
                  {f.l(b)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t('clinic.appointments.doctor')} htmlFor="f-doctor">
            <NativeSelect id="f-doctor" value={draft.doctor_id} onChange={set('doctor_id')}>
              <option value="">{t('common.all')}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t('clinic.appointments.status')} htmlFor="f-status">
            <NativeSelect id="f-status" value={draft.status} onChange={set('status')}>
              <option value="">{t('common.all')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t('clinic.appointments.from')} htmlFor="f-from">
            <Input id="f-from" type="date" value={draft.from} onChange={set('from')} />
          </Field>
          <Field label={t('clinic.appointments.to')} htmlFor="f-to">
            <Input
              id="f-to"
              type="date"
              value={draft.to}
              min={draft.from || undefined}
              onChange={set('to')}
            />
          </Field>
          <Field label={t('clinic.appointments.keyword')} htmlFor="f-q">
            <Input id="f-q" type="search" maxLength={50} value={draft.q} onChange={set('q')} />
          </Field>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit">
              <Search aria-hidden />
              {t('clinic.appointments.apply')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraft(defaults);
                apply(defaults);
              }}
            >
              <RotateCcw aria-hidden />
              {t('clinic.appointments.clear')}
            </Button>
          </div>
        </form>
      </Section>

      {query.isPending ? (
        <LoadingState rows={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          icon={CalendarSearch}
          title={t('clinic.appointments.empty')}
          description={t('clinic.appointments.emptyHint')}
        />
      ) : (
        <Section>
          <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
            {t('clinic.appointments.results', { count: f.number(query.data.pagination.total) })}
          </p>
          <div
            className={cn(
              '-mx-(--card-spacing) transition-opacity',
              query.isPlaceholderData && 'opacity-60',
            )}
          >
            <ClinicAppointmentsTable items={query.data.items} onDetails={setDetailId} />
          </div>
          <Pagination meta={query.data.pagination} onPageChange={setPage} />
        </Section>
      )}

      {can(P.bookAppointments) && (
        <BookOnBehalfDialog
          open={booking}
          onClose={() => setBooking(false)}
          onBooked={() => {
            setDraft(defaults);
            apply(defaults);
          }}
        />
      )}
      <ClinicAppointmentDialog appointmentId={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}
