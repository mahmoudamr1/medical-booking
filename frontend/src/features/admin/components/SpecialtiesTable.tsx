'use client';

import { Pencil, Trash2 } from 'lucide-react';
import type { AdminSpecialty } from '../types';
import { Pager, useClientPage } from '@/components/shared/ClientPager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFormat, useT } from '@/i18n/provider';

/** Specialties list, paged client-side (the endpoint returns the whole list). */
export function SpecialtiesTable({
  items,
  onEdit,
  onDelete,
}: {
  items: AdminSpecialty[];
  onEdit: (s: AdminSpecialty) => void;
  onDelete: (s: AdminSpecialty) => void;
}) {
  const t = useT();
  const f = useFormat();
  const { pageItems, meta, setPage } = useClientPage(items, 20);
  return (
    <Card className="gap-0 py-0">
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow>
            <TableHead className="ps-4">{t('admin.specialties.columns.name')}</TableHead>
            <TableHead>{t('admin.specialties.columns.slug')}</TableHead>
            <TableHead className="text-end">{t('admin.specialties.columns.doctors')}</TableHead>
            <TableHead className="text-end">{t('admin.specialties.columns.order')}</TableHead>
            <TableHead>{t('admin.specialties.columns.status')}</TableHead>
            <TableHead className="pe-4">
              <span className="sr-only">{t('common.actions')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.map((s) => (
            <TableRow key={s.id} data-testid={`specialty-row-${s.slug}`}>
              <TableCell className="ps-4">
                <p className="font-medium">{f.l(s)}</p>
                <p className="text-xs text-muted-foreground">
                  {s.name_ar} · <span dir="ltr">{s.name_en}</span>
                </p>
              </TableCell>
              <TableCell>
                <span dir="ltr" className="font-mono text-xs">
                  {s.slug}
                </span>
              </TableCell>
              <TableCell className="text-end tabular-nums">{f.number(s.doctors_count)}</TableCell>
              <TableCell className="text-end tabular-nums">{f.number(s.sort_order)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={s.is_active ? 'success' : 'muted'}>
                    {s.is_active ? t('admin.specialties.active') : t('admin.specialties.inactive')}
                  </Badge>
                  {s.is_general_practice && (
                    <Badge variant="info">{t('admin.specialties.gp')}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="pe-4">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${t('common.edit')} ${f.l(s)}`}
                    onClick={() => onEdit(s)}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${t('common.delete')} ${f.l(s)}`}
                    onClick={() => onDelete(s)}
                  >
                    <Trash2 className="text-destructive" aria-hidden />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pager meta={meta} onPageChange={setPage} />
    </Card>
  );
}
