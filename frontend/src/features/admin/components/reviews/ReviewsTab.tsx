'use client';

import { Stars } from '@/features/reviews';
import { REVIEW_STATUSES } from './ReviewsScreen';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Eye, EyeOff, MessageSquare } from 'lucide-react';
import { adminApi } from '../../api';
import { adminKeys } from '../../hooks/keys';
import { ReviewStatusBadge } from '../badges';
import { FilterBar, SelectFilter, useUrlFilters } from '../filters';
import { ListCard } from '../ListCard';
import { useConfirmAction } from '../../hooks/useStatusAction';
import type { AdminReview, ReviewStatus } from '../../types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
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
import { useFormat, useT } from '@/i18n/provider';

export function ReviewsTab() {
  const t = useT();
  const f = useFormat();
  const { values, set, page } = useUrlFilters(['tab', 'status', 'reported'] as const);
  const reported = values.reported === '1';
  const params = { status: values.status as ReviewStatus | '', reported, page };
  const list = useQuery({
    queryKey: [...adminKeys.reviews, params],
    queryFn: () => adminApi.reviews(params),
    placeholderData: keepPreviousData,
  });
  const action = useConfirmAction<AdminReview, 'hide' | 'restore'>(
    (r, a, reason) => adminApi.moderateReview(r.id, a, reason),
    [adminKeys.reviews, adminKeys.stats],
  );
  const hiding = action.target?.action === 'hide';

  return (
    <>
      <FilterBar>
        <SelectFilter
          id="reviews-status"
          label={t('admin.filters.status')}
          value={values.status}
          onChange={(status) => set({ status })}
          allLabel={t('admin.filters.all')}
          options={REVIEW_STATUSES.map((s) => ({
            value: s,
            label: t(`admin.reviews.status.${s}`),
          }))}
        />
        <CheckboxField
          id="reviews-reported"
          className="min-h-10 items-center"
          label={t('admin.reviews.reportedOnly')}
          checked={reported}
          onChange={(e) => set({ reported: e.target.checked ? '1' : null })}
        />
      </FilterBar>

      <ListCard
        query={list}
        cols={5}
        empty={t('admin.reviews.empty')}
        emptyIcon={<MessageSquare aria-hidden />}
        onPageChange={(p) => set({ page: p })}
      >
        {(items) => (
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">{t('admin.reviews.rating')}</TableHead>
                <TableHead>{t('admin.reviews.comment')}</TableHead>
                <TableHead>{t('admin.reviews.doctor')}</TableHead>
                <TableHead>{t('admin.reviews.patient')}</TableHead>
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
                  <TableCell className="ps-4">
                    <Stars value={r.rating} />
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-normal">
                    {r.comment ? (
                      <p className="line-clamp-3 text-sm">{r.comment}</p>
                    ) : (
                      <span className="text-muted-foreground">{t('admin.reviews.noComment')}</span>
                    )}
                    {r.moderation_reason && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t('admin.reviews.moderationReason')}: {r.moderation_reason}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{r.doctor.name ?? '—'}</TableCell>
                  <TableCell>{r.patient.name ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <ReviewStatusBadge status={r.status} />
                      {!!r.open_reports_count && (
                        <Badge variant="warning">
                          {t('admin.reviews.openReports', {
                            count: f.number(r.open_reports_count),
                          })}
                        </Badge>
                      )}
                    </div>
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
                  <TableCell className="pe-4 text-end">
                    {r.status === 'published' ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => action.open(r, 'hide')}
                      >
                        <EyeOff aria-hidden />
                        {t('admin.reviews.hide')}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => action.open(r, 'restore')}>
                        <Eye aria-hidden />
                        {t('admin.reviews.restore')}
                      </Button>
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
        title={hiding ? t('admin.reviews.hideTitle') : t('admin.reviews.restoreTitle')}
        description={hiding ? t('admin.reviews.hideBody') : t('admin.reviews.restoreBody')}
        confirmLabel={hiding ? t('admin.reviews.hide') : t('admin.reviews.restore')}
        destructive={hiding}
        pending={action.pending}
        error={action.error}
        reason={{
          label: hiding ? t('admin.reasonRequired') : t('admin.reasonOptional'),
          placeholder: t('admin.reasonPlaceholder'),
          required: hiding,
        }}
        onConfirm={action.confirm}
      />
    </>
  );
}
