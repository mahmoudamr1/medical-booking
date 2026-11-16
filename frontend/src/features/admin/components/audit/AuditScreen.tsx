'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { adminApi } from '../../api';
import { adminKeys } from '../../hooks/keys';
import { DateFilter, FilterBar, FilterChip, SearchBox, nextDay, useUrlFilters } from '../filters';
import { JsonDetails } from '../DetailList';
import { ListCard } from '../ListCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFormat, useT } from '@/i18n/provider';

/** "App\\Models\\DoctorProfile" → "DoctorProfile". */
function shortType(type: string | null): string {
  return type ? (type.split('\\').pop() ?? type) : '';
}

export function AuditScreen() {
  const t = useT();
  const f = useFormat();
  const { values, set, page } = useUrlFilters([
    'action',
    'actor',
    'subject',
    'from',
    'to',
  ] as const);

  const params = {
    action: values.action,
    actor_id: values.actor,
    subject_id: values.subject,
    from: values.from,
    to: values.to ? nextDay(values.to) : '',
    page,
  };
  const list = useQuery({
    queryKey: [...adminKeys.audit, params],
    queryFn: () => adminApi.auditLogs(params),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.audit.title')} description={t('admin.audit.subtitle')} />

      <FilterBar>
        <SearchBox
          id="audit-action"
          label={t('admin.audit.action')}
          value={values.action}
          onCommit={(action) => set({ action })}
          placeholder={t('admin.audit.actionPlaceholder')}
        />
        <DateFilter
          id="audit-from"
          label={t('admin.filters.from')}
          value={values.from}
          onChange={(from) => set({ from })}
        />
        <DateFilter
          id="audit-to"
          label={t('admin.filters.to')}
          value={values.to}
          min={values.from || undefined}
          onChange={(to) => set({ to })}
        />
        {(values.actor || values.subject) && (
          <div className="flex basis-full flex-wrap gap-2">
            {values.actor && (
              <FilterChip
                label={`${t('admin.audit.actorId')}: ${values.actor}`}
                onRemove={() => set({ actor: null })}
              />
            )}
            {values.subject && (
              <FilterChip
                label={`${t('admin.audit.subjectId')}: ${values.subject}`}
                onRemove={() => set({ subject: null })}
              />
            )}
          </div>
        )}
      </FilterBar>

      <ListCard
        query={list}
        cols={5}
        empty={t('admin.audit.empty')}
        emptyIcon={<ClipboardList aria-hidden />}
        onPageChange={(p) => set({ page: p })}
      >
        {(items) => (
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">{t('admin.audit.columns.time')}</TableHead>
                <TableHead>{t('admin.audit.columns.actor')}</TableHead>
                <TableHead>{t('admin.audit.columns.action')}</TableHead>
                <TableHead>{t('admin.audit.columns.subject')}</TableHead>
                <TableHead>{t('admin.audit.columns.ip')}</TableHead>
                <TableHead className="pe-4">{t('admin.audit.changes')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((l) => (
                <TableRow key={l.id} className="align-top">
                  <TableCell className="ps-4 align-top text-muted-foreground">
                    {l.created_at ? f.dateTime(l.created_at) : '—'}
                  </TableCell>
                  <TableCell className="align-top">
                    {l.actor ? (
                      <button
                        type="button"
                        className="text-start hover:underline"
                        title={t('admin.audit.filterActor')}
                        onClick={() => set({ actor: l.actor!.id })}
                      >
                        <span className="block font-medium">{l.actor.name}</span>
                        <span className="block text-xs text-muted-foreground" dir="ltr">
                          {l.actor.email}
                        </span>
                      </button>
                    ) : (
                      <span className="text-muted-foreground">{t('admin.audit.system')}</span>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <button
                      type="button"
                      onClick={() => set({ action: l.action })}
                      title={t('admin.audit.action')}
                    >
                      <Badge variant="muted" className="font-mono" dir="ltr">
                        {l.action}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="align-top">
                    {l.subject_id ? (
                      <button
                        type="button"
                        className="text-start hover:underline"
                        title={t('admin.audit.filterSubject')}
                        onClick={() => set({ subject: l.subject_id })}
                      >
                        <span className="block text-xs font-medium">
                          {shortType(l.subject_type)}
                        </span>
                        <span className="block font-mono text-xs text-muted-foreground" dir="ltr">
                          {l.subject_id}
                        </span>
                      </button>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell
                    className="align-top font-mono text-xs text-muted-foreground"
                    dir="ltr"
                  >
                    {l.ip_address ?? '—'}
                  </TableCell>
                  <TableCell className="pe-4 align-top whitespace-normal">
                    <JsonDetails value={l.changes} summary={t('admin.audit.changes')} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListCard>
    </div>
  );
}
