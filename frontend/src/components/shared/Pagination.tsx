'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormat, useT } from '@/i18n/provider';
import type { Pagination as PaginationMeta } from '@/types/api';

export function Pagination({
  meta,
  onPageChange,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  const t = useT();
  const f = useFormat();
  if (meta.last_page <= 1) return null;
  const { current_page: page, last_page: last } = meta;

  return (
    <nav className="flex items-center justify-center gap-3 pt-6" aria-label="pagination">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="rtl:rotate-180" aria-hidden />
        {t('common.previous')}
      </Button>
      <span className="text-sm text-muted-foreground tabular-nums">
        {t('common.page', { page: f.number(page), last: f.number(last) })}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= last}
        onClick={() => onPageChange(page + 1)}
      >
        {t('common.next')}
        <ChevronRight className="rtl:rotate-180" aria-hidden />
      </Button>
    </nav>
  );
}
