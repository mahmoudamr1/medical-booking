'use client';

import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { BarChart3, Table2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminApi } from '../api';
import { adminKeys } from '../hooks/keys';
import type { AppointmentReportRow, ReportGroupBy } from '../types';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFormat, useI18n } from '@/i18n/provider';
import { cn } from '@/lib/utils';

export const REPORT_GROUPS: ReportGroupBy[] = ['day', 'specialty', 'clinic'];

/** Categorical slots 1–3 of the validated reference palette (fixed order, never cycled). */
const SERIES = [
  { key: 'total', color: '#2a78d6' },
  { key: 'cancelled', color: '#eb6834' },
  { key: 'completed', color: '#1baf7a' },
] as const;

/** Appointments report for the admin overview: grouped bar chart or table, by day / specialty / clinic. */
export function AppointmentsReport({
  range,
  enabled,
  groupBy,
  onGroupBy,
}: {
  range: { from?: string; to?: string };
  enabled: boolean;
  groupBy: ReportGroupBy;
  onGroupBy: (g: ReportGroupBy) => void;
}) {
  const { t, dir } = useI18n();
  const f = useFormat();
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const report = useQuery({
    queryKey: [...adminKeys.stats, 'report', groupBy, range],
    queryFn: () => adminApi.appointmentReport({ ...range, group_by: groupBy }),
    placeholderData: keepPreviousData,
    enabled,
  });

  const labelFor = useMemo(
    () => (row: AppointmentReportRow) => {
      if (groupBy === 'day')
        return f.dateKey(String(row.key).slice(0, 10), { day: 'numeric', month: 'short' });
      if (!row.label_ar && !row.label_en)
        return row.key === 'online' ? t('admin.overview.report.online') : row.key;
      return f.l({ label_ar: row.label_ar, label_en: row.label_en }, 'label');
    },
    [groupBy, f, t],
  );

  const chartData = useMemo(
    () =>
      (report.data?.rows ?? []).map((r) => ({
        label: labelFor(r),
        total: Number(r.total),
        completed: Number(r.completed),
        cancelled: Number(r.cancelled),
        completed_value: Number(r.completed_value),
      })),
    [report.data, labelFor],
  );

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-lg">
            <h2>{t('admin.overview.report.title')}</h2>
          </CardTitle>
          <CardDescription>{t('admin.overview.report.subtitle')}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label={t('admin.overview.report.groupBy')}
            className="inline-flex rounded-lg bg-muted p-0.5"
          >
            {REPORT_GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={groupBy === g}
                onClick={() => onGroupBy(g)}
                className={cn(
                  'min-h-9 rounded-md px-3 text-sm font-medium transition-colors sm:min-h-8',
                  groupBy === g
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t(`admin.overview.report.group.${g}`)}
              </button>
            ))}
          </div>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => setView(view === 'chart' ? 'table' : 'chart')}
            aria-label={
              view === 'chart' ? t('admin.overview.showTable') : t('admin.overview.showChart')
            }
            title={view === 'chart' ? t('admin.overview.showTable') : t('admin.overview.showChart')}
          >
            {view === 'chart' ? <Table2 /> : <BarChart3 />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {report.isPending ? (
          <Skeleton className="h-72 w-full rounded-lg" />
        ) : report.isError ? (
          <ErrorState error={report.error} onRetry={() => report.refetch()} />
        ) : chartData.length === 0 ? (
          <EmptyState icon={<BarChart3 aria-hidden />} title={t('admin.overview.report.empty')} />
        ) : view === 'chart' ? (
          <div
            className="h-80 w-full"
            role="img"
            aria-label={t('admin.overview.report.chartLabel')}
            dir="ltr"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                barGap={2}
                barCategoryGap="20%"
              >
                <CartesianGrid vertical={false} stroke="#e7e5e4" />
                <XAxis
                  dataKey="label"
                  reversed={dir === 'rtl'}
                  tickLine={false}
                  axisLine={{ stroke: '#d6d3d1' }}
                  tick={{ fontSize: 12, fill: '#52514e' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  orientation={dir === 'rtl' ? 'right' : 'left'}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tick={{ fontSize: 12, fill: '#52514e' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  formatter={(value, name) => [f.number(Number(value)), String(name)]}
                  contentStyle={{ borderRadius: 8, fontSize: 12, direction: dir }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {SERIES.map((s) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={t(`admin.overview.report.${s.key}`)}
                    fill={s.color}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Table className="min-w-[520px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.overview.report.key')}</TableHead>
                <TableHead className="text-end">{t('admin.overview.report.total')}</TableHead>
                <TableHead className="text-end">{t('admin.overview.report.completed')}</TableHead>
                <TableHead className="text-end">{t('admin.overview.report.cancelled')}</TableHead>
                <TableHead className="text-end">
                  {t('admin.overview.report.completedValue')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartData.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="text-end tabular-nums">{f.number(r.total)}</TableCell>
                  <TableCell className="text-end tabular-nums">{f.number(r.completed)}</TableCell>
                  <TableCell className="text-end tabular-nums">{f.number(r.cancelled)}</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {f.money(r.completed_value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
