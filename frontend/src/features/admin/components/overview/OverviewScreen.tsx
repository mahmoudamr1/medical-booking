'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { adminKeys } from '../../hooks/keys';
import { AdminOverviewStats } from '../AdminOverviewStats';
import { AppointmentsReport, REPORT_GROUPS } from '../AppointmentsReport';
import { DateFilter, FilterBar, dateInputValue, nextDay, useUrlFilters } from '../filters';
import type { ReportGroupBy } from '../../types';
import { ErrorState } from '@/components/shared/states';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { useFormat, useI18n } from '@/i18n/provider';

function daysAgo(n: number): string {
  return dateInputValue(new Date(Date.now() - n * 86_400_000));
}

export function OverviewScreen() {
  const { t } = useI18n();
  const f = useFormat();
  const { values, set } = useUrlFilters(['from', 'to', 'group_by'] as const);
  const groupBy: ReportGroupBy = REPORT_GROUPS.includes(values.group_by as ReportGroupBy)
    ? (values.group_by as ReportGroupBy)
    : 'day';

  const invalidRange = !!values.from && !!values.to && values.to < values.from;
  const range = invalidRange
    ? {}
    : { from: values.from || undefined, to: values.to ? nextDay(values.to) : undefined };

  const stats = useQuery({
    queryKey: [...adminKeys.stats, range],
    queryFn: () => adminApi.stats(range),
    placeholderData: keepPreviousData,
    enabled: !invalidRange,
  });
  const presets = [
    { days: 7, label: t('admin.overview.last7') },
    { days: 30, label: t('admin.overview.last30') },
    { days: 90, label: t('admin.overview.last90') },
  ];
  const today = dateInputValue(new Date());
  const s = stats.data;

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.overview.title')} description={t('admin.overview.subtitle')} />

      <FilterBar>
        <DateFilter
          id="ov-from"
          label={t('admin.filters.from')}
          value={values.from}
          onChange={(v) => set({ from: v })}
        />
        <DateFilter
          id="ov-to"
          label={t('admin.filters.to')}
          value={values.to}
          min={values.from || undefined}
          onChange={(v) => set({ to: v })}
        />
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => {
            const active = values.from === daysAgo(p.days) && values.to === today;
            return (
              <Button
                key={p.days}
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => set({ from: daysAgo(p.days), to: today })}
              >
                {p.label}
              </Button>
            );
          })}
          {(values.from || values.to) && (
            <Button size="sm" variant="ghost" onClick={() => set({ from: null, to: null })}>
              {t('admin.filters.clear')}
            </Button>
          )}
        </div>
        <p className="basis-full text-xs text-muted-foreground" aria-live="polite">
          {invalidRange ? (
            <span className="text-destructive">{t('admin.overview.invalidRange')}</span>
          ) : s ? (
            t('admin.overview.range', {
              from: f.date(s.range.from, undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
              to: f.date(s.range.to, undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            })
          ) : (
            t('admin.overview.rangeDefault')
          )}
        </p>
      </FilterBar>

      {stats.isError ? (
        <ErrorState error={stats.error} onRetry={() => stats.refetch()} />
      ) : (
        <AdminOverviewStats stats={stats.data} />
      )}

      <AppointmentsReport
        range={range}
        enabled={!invalidRange}
        groupBy={groupBy}
        onGroupBy={(g) => set({ group_by: g === 'day' ? null : g })}
      />
    </div>
  );
}
