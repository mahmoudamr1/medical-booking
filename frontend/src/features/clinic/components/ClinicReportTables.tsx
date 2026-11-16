'use client';

import type { ReactNode } from 'react';
import { Pager, useClientPage } from '@/components/shared/ClientPager';
import { Section } from '@/components/shared/states';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { ClinicReport } from '../types';

interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  numeric?: boolean;
}

/** A titled report breakdown, paged client-side (breakdowns can run to hundreds of rows). */
function PagedReportTable<T>({
  title,
  rows,
  rowKey,
  columns,
  pageSize = 10,
  className,
}: {
  title: string;
  rows: T[];
  rowKey: (row: T) => string;
  columns: Column<T>[];
  pageSize?: number;
  className?: string;
}) {
  const { pageItems, meta, setPage } = useClientPage(rows, pageSize);
  const edge = (i: number) =>
    cn(i === 0 && 'ps-(--card-spacing)', i === columns.length - 1 && 'pe-(--card-spacing)');
  return (
    <Section title={title} className={cn('gap-3', className)}>
      <div className="-mx-(--card-spacing)">
        <Table className={columns.length > 2 ? 'min-w-[28rem]' : undefined}>
          <TableHeader>
            <TableRow>
              {columns.map((c, i) => (
                <TableHead
                  key={c.header}
                  className={cn(c.numeric ? 'text-end' : 'text-start', edge(i))}
                >
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((r) => (
              <TableRow key={rowKey(r)}>
                {columns.map((c, i) => (
                  <TableCell
                    key={c.header}
                    className={cn(
                      c.numeric ? 'text-end tabular-nums' : i === 0 && 'font-medium',
                      edge(i),
                    )}
                  >
                    {c.cell(r)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pager meta={meta} onPageChange={setPage} />
      </div>
    </Section>
  );
}

/** By-doctor, by-branch and by-day breakdowns of the clinic report. */
export function ClinicReportTables({ report }: { report: ClinicReport }) {
  const t = useT();
  const f = useFormat();
  const n = (v: number | string) => f.number(Number(v), 0);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <PagedReportTable
        title={t('clinic.overview.byDoctor')}
        rows={report.by_doctor}
        rowKey={(r) => r.doctor_id}
        columns={[
          { header: t('clinic.appointments.doctor'), cell: (r) => r.name },
          { header: t('clinic.overview.total'), cell: (r) => n(r.total), numeric: true },
          { header: t('clinic.overview.completed'), cell: (r) => n(r.completed), numeric: true },
          { header: t('clinic.overview.cancelled'), cell: (r) => n(r.cancelled), numeric: true },
        ]}
      />
      <PagedReportTable
        title={t('clinic.overview.byBranch')}
        rows={report.by_branch}
        rowKey={(r) => r.branch_id}
        columns={[
          { header: t('clinic.appointments.branch'), cell: (r) => f.l(r) },
          { header: t('clinic.overview.count'), cell: (r) => n(r.total), numeric: true },
        ]}
      />
      <PagedReportTable
        title={t('clinic.overview.byDay')}
        className="xl:col-span-2"
        pageSize={14}
        rows={report.by_day}
        rowKey={(r) => r.day}
        columns={[
          {
            header: t('clinic.appointments.when'),
            cell: (r) =>
              f.dateKey(r.day.slice(0, 10), { weekday: 'short', day: 'numeric', month: 'short' }),
          },
          { header: t('clinic.overview.count'), cell: (r) => n(r.total), numeric: true },
        ]}
      />
    </div>
  );
}
