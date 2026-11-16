'use client';

import { useState, type FormEvent } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Ban,
  Building2,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Hourglass,
  UserX,
  Wallet,
} from 'lucide-react';
import { useClinic } from '../ClinicContext';
import { ClinicReportTables } from '../ClinicReportTables';
import { clinicApi } from '../../api';
import { clinicKeys } from '../../hooks/keys';
import { ErrorState, LoadingState, Section } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { BUSINESS_TZ, addDaysToKey, todayKey, zonedDayStartIso } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';

export function Reports() {
  const t = useT();
  const f = useFormat();
  const { clinicId } = useClinic();
  const today = todayKey(BUSINESS_TZ);
  const [draft, setDraft] = useState({
    from: addDaysToKey(today, -30),
    to: addDaysToKey(today, 30),
  });
  const [range, setRange] = useState(draft);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: clinicKeys.of(clinicId, 'reports', range),
    // `to` is inclusive in the UI: send the start of the following day (Cairo time).
    queryFn: () =>
      clinicApi.reports(clinicId, {
        from: zonedDayStartIso(range.from, BUSINESS_TZ),
        to: zonedDayStartIso(addDaysToKey(range.to, 1), BUSINESS_TZ),
      }),
    placeholderData: keepPreviousData,
  });

  const apply = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.from || !draft.to || draft.to < draft.from) {
      setRangeError(t('clinic.overview.rangeInvalid'));
      return;
    }
    setRangeError(null);
    setRange(draft);
  };

  const n = (v: number | string) => f.number(Number(v), 0);

  return (
    <div className="space-y-6">
      <Section
        title={t('clinic.overview.reportsTitle')}
        description={t('clinic.overview.reportsHint')}
      >
        <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
          <Field label={t('clinic.overview.from')} htmlFor="r-from" className="w-44">
            <Input
              id="r-from"
              type="date"
              value={draft.from}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
            />
          </Field>
          <Field label={t('clinic.overview.to')} htmlFor="r-to" className="w-44">
            <Input
              id="r-to"
              type="date"
              value={draft.to}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            />
          </Field>
          <Button type="submit" variant="outline">
            {t('clinic.overview.apply')}
          </Button>
        </form>
        {rangeError && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {rangeError}
          </p>
        )}
      </Section>

      {query.isPending ? (
        <LoadingState rows={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <div className={query.isPlaceholderData ? 'space-y-6 opacity-60' : 'space-y-6'}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="clinic-report-totals">
            <StatCard
              label={t('clinic.overview.total')}
              value={n(query.data.totals.total)}
              icon={<CalendarClock />}
            />
            <StatCard
              label={t('clinic.overview.confirmed')}
              value={n(query.data.totals.confirmed)}
              icon={<CalendarCheck />}
              tone="success"
            />
            <StatCard
              label={t('clinic.overview.pending')}
              value={n(query.data.totals.pending)}
              icon={<Hourglass />}
              tone="warning"
            />
            <StatCard
              label={t('clinic.overview.completed')}
              value={n(query.data.totals.completed)}
              icon={<CheckCircle2 />}
              tone="info"
            />
            <StatCard
              label={t('clinic.overview.cancelled')}
              value={n(query.data.totals.cancelled)}
              icon={<Ban />}
              tone="muted"
            />
            <StatCard
              label={t('clinic.overview.noShow')}
              value={n(query.data.totals.no_show)}
              icon={<UserX />}
              tone="danger"
            />
            <StatCard
              label={t('clinic.overview.revenue')}
              value={f.money(Number(query.data.totals.completed_revenue))}
              icon={<Wallet />}
              tone="success"
            />
            <StatCard
              label={t('clinic.overview.organization')}
              value={n(query.data.organization.branches)}
              icon={<Building2 />}
              hint={`${t('clinic.overview.branches')} · ${n(query.data.organization.doctors)} ${t('clinic.overview.doctors')} · ${n(query.data.organization.staff)} ${t('clinic.overview.staff')}`}
            />
          </div>

          {Number(query.data.totals.total) === 0 ? (
            <EmptyState title={t('clinic.overview.noData')} />
          ) : (
            <ClinicReportTables report={query.data} />
          )}
        </div>
      )}
    </div>
  );
}
