'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Flag, Siren } from 'lucide-react';
import { adminApi } from '../../api';
import { adminKeys } from '../../hooks/keys';
import { FilterBar, SelectFilter, useUrlFilters } from '../filters';
import { ListCard } from '../ListCard';
import { UrgentLiveBoard } from '../UrgentLiveBoard';
import { UrgentSheet } from '../UrgentSheet';
import { UrgentStatusBadge, URGENT_STATUSES, type UrgentStatus } from '@/features/urgent';
import { PageHeader } from '@/components/shared/PageHeader';
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

export function UrgentScreen() {
  const t = useT();
  const f = useFormat();
  const { values, set, page } = useUrlFilters(['status', 'flagged', 'request'] as const);
  const flagged = values.flagged === '1';

  const params = { status: values.status as UrgentStatus | '', flagged, page };
  const list = useQuery({
    queryKey: [...adminKeys.urgent, 'list', params],
    queryFn: () => adminApi.urgentRequests(params),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.urgent.title')} description={t('admin.urgent.subtitle')} />
      <UrgentLiveBoard onOpen={(id) => set({ request: id, page })} />

      <FilterBar>
        <SelectFilter
          id="urgent-status"
          label={t('admin.filters.status')}
          value={values.status}
          onChange={(status) => set({ status })}
          allLabel={t('admin.filters.all')}
          options={URGENT_STATUSES.map((s) => ({ value: s, label: t(`urgent.status.${s}`) }))}
        />
        <CheckboxField
          id="urgent-flagged"
          className="min-h-10 items-center"
          label={t('admin.urgent.flaggedOnly')}
          checked={flagged}
          onChange={(e) => set({ flagged: e.target.checked ? '1' : null })}
        />
      </FilterBar>

      <ListCard
        query={list}
        cols={6}
        empty={t('admin.urgent.empty')}
        emptyIcon={<Siren aria-hidden />}
        onPageChange={(p) => set({ page: p })}
      >
        {(items) => (
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">{t('admin.urgent.columns.created')}</TableHead>
                <TableHead>{t('admin.urgent.columns.patient')}</TableHead>
                <TableHead>{t('admin.urgent.columns.specialty')}</TableHead>
                <TableHead>{t('admin.urgent.columns.location')}</TableHead>
                <TableHead>{t('admin.urgent.columns.status')}</TableHead>
                <TableHead>{t('admin.urgent.columns.doctor')}</TableHead>
                <TableHead className="pe-4">
                  <span className="sr-only">{t('common.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="ps-4">
                    {r.created_at ? f.dateTime(r.created_at) : '—'}
                  </TableCell>
                  <TableCell>{r.patient?.name ?? '—'}</TableCell>
                  <TableCell>{r.specialty ? f.l(r.specialty) : '—'}</TableCell>
                  <TableCell>
                    {[f.l(r.city), f.l(r.governorate)].filter(Boolean).join('، ') || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <UrgentStatusBadge status={r.status} />
                      {r.flagged?.at && (
                        <Badge variant="danger" title={r.flagged.reason ?? undefined}>
                          <Flag aria-hidden />
                          {t('admin.urgent.flagged')}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{r.accepted_doctor?.name ?? '—'}</TableCell>
                  <TableCell className="pe-4 text-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => set({ request: r.id, page })}
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

      <UrgentSheet
        requestId={values.request || null}
        onClose={() => set({ request: null, page })}
      />
    </div>
  );
}
