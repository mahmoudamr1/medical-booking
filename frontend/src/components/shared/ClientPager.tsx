'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormat, useT } from '@/i18n/provider';
import type { Pagination as PaginationMeta } from '@/types/api';
import { cn } from '@/lib/utils';

/**
 * Client-side paging for endpoints that return a whole (possibly long) list. Keeps the DOM
 * bounded to `pageSize` rows; the page is clamped when the list shrinks (e.g. after a filter).
 */
export function useClientPage<T>(items: readonly T[] | undefined, pageSize = 20) {
  const [page, setPage] = useState(1);
  const total = items?.length ?? 0;
  const last = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, last);
  const start = (current - 1) * pageSize;
  const meta: PaginationMeta = {
    current_page: current,
    per_page: pageSize,
    total,
    last_page: last,
  };
  return { pageItems: (items ?? []).slice(start, start + pageSize), meta, setPage, start };
}

/** Compact pager row: "1–20 of 134" with previous/next buttons. Renders nothing for one page. */
export function Pager({
  meta,
  onPageChange,
  className,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const t = useT();
  const f = useFormat();
  if (meta.last_page <= 1) return null;
  const from = (meta.current_page - 1) * meta.per_page + 1;
  const to = Math.min(meta.total, meta.current_page * meta.per_page);
  return (
    <nav
      aria-label="pagination"
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm',
        className,
      )}
    >
      <span className="text-muted-foreground tabular-nums" aria-live="polite">
        {t('dashboard.pager.range', {
          from: f.number(from),
          to: f.number(to),
          total: f.number(meta.total),
        })}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.current_page <= 1}
          onClick={() => onPageChange(meta.current_page - 1)}
        >
          <ChevronLeft className="rtl:rotate-180" aria-hidden />
          {t('common.previous')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.current_page >= meta.last_page}
          onClick={() => onPageChange(meta.current_page + 1)}
        >
          {t('common.next')}
          <ChevronRight className="rtl:rotate-180" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
