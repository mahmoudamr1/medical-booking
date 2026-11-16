'use client';

import { REPORT_STATUSES } from './ReviewsScreen';
import { Stars } from '@/features/reviews';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Check, Flag, X } from 'lucide-react';
import { adminApi } from '../../api';
import { adminKeys } from '../../hooks/keys';
import { ReportStatusBadge, ReviewStatusBadge } from '../badges';
import { FilterBar, SelectFilter, useUrlFilters } from '../filters';
import { ListCard } from '../ListCard';
import { useConfirmAction } from '../../hooks/useStatusAction';
import type { AdminReviewReport, ReportStatus } from '../../types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
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

export function ReportsTab() {
  const t = useT();
  const f = useFormat();
  const { values, set, page } = useUrlFilters(['tab', 'rstatus'] as const);
  const status: ReportStatus = (REPORT_STATUSES as string[]).includes(values.rstatus)
    ? (values.rstatus as ReportStatus)
    : 'open';
  const params = { status, page };
  const list = useQuery({
    queryKey: [...adminKeys.reports, params],
    queryFn: () => adminApi.reviewReports(params),
    placeholderData: keepPreviousData,
  });
  const action = useConfirmAction<AdminReviewReport, 'resolve' | 'dismiss'>(
    (r, decision) => adminApi.decideReport(r.id, decision),
    [adminKeys.reports, adminKeys.reviews, adminKeys.stats],
  );
  const resolving = action.target?.action === 'resolve';

  return (
    <>
      <FilterBar>
        <SelectFilter
          id="reports-status"
          label={t('admin.filters.status')}
          value={status}
          onChange={(v) => set({ rstatus: v === 'open' ? null : v })}
          options={REPORT_STATUSES.map((s) => ({
            value: s,
            label: t(`admin.reviews.reportStatus.${s}`),
          }))}
        />
      </FilterBar>

      <ListCard
        query={list}
        cols={5}
        empty={t('admin.reviews.emptyReports')}
        emptyIcon={<Flag aria-hidden />}
        onPageChange={(p) => set({ page: p })}
      >
        {(items) => (
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">{t('admin.reviews.review')}</TableHead>
                <TableHead>{t('admin.reviews.reportReason')}</TableHead>
                <TableHead>{t('admin.reviews.reporter')}</TableHead>
                <TableHead>{t('admin.filters.status')}</TableHead>
                <TableHead>{t('admin.reviews.date')}</TableHead>
                <TableHead className="pe-4">
                  <span className="sr-only">{t('common.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-xs ps-4 whitespace-normal">
                    <div className="flex items-center gap-2">
                      <Stars value={r.review.rating} />
                      <ReviewStatusBadge status={r.review.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {r.review.comment || t('admin.reviews.noComment')}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-normal">{r.reason ?? '—'}</TableCell>
                  <TableCell>{r.reporter?.name ?? '—'}</TableCell>
                  <TableCell>
                    <ReportStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.created_at
                      ? f.date(r.created_at, undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="pe-4">
                    {r.status === 'open' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => action.open(r, 'resolve')}
                        >
                          <Check aria-hidden />
                          {t('admin.reviews.resolve')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => action.open(r, 'dismiss')}>
                          <X aria-hidden />
                          {t('admin.reviews.dismiss')}
                        </Button>
                      </div>
                    )}
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
        title={resolving ? t('admin.reviews.resolveTitle') : t('admin.reviews.dismissTitle')}
        description={resolving ? t('admin.reviews.resolveBody') : t('admin.reviews.dismissBody')}
        confirmLabel={resolving ? t('admin.reviews.resolve') : t('admin.reviews.dismiss')}
        pending={action.pending}
        error={action.error}
        onConfirm={action.confirm}
      />
    </>
  );
}
