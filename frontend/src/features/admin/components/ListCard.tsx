'use client';

import { type ReactNode } from 'react';
import { SearchX } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { Pagination as PaginationMeta } from '@/types/api';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/shared/Pagination';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

// ---- Lists / tables --------------------------------------------------------------------

interface PageData<T> {
  items: T[];
  pagination: PaginationMeta;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  const t = useT();
  return (
    <div className="space-y-3 p-4" role="status" aria-label={t('common.loading')}>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className="h-5 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Card that renders loading skeleton / error+retry / empty state / table + pagination
 * for a paginated admin query.
 */
export function ListCard<T>({
  query,
  empty,
  emptyIcon,
  children,
  onPageChange,
  cols,
  toolbar,
}: {
  query: UseQueryResult<PageData<T>>;
  empty: string;
  emptyIcon?: ReactNode;
  children: (items: T[]) => ReactNode;
  onPageChange: (page: number) => void;
  cols?: number;
  toolbar?: ReactNode;
}) {
  const t = useT();
  const f = useFormat();
  if (query.isPending) {
    return (
      <Card className="gap-0 py-0">
        <TableSkeleton cols={cols} />
      </Card>
    );
  }
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const { items, pagination } = query.data;
  if (items.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon ?? <SearchX aria-hidden />}
        title={empty}
        description={t('admin.noResultsHint')}
      />
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-muted-foreground">
        <span data-testid="result-count">
          {t('admin.results', { count: f.number(pagination.total) })}
        </span>
        {toolbar}
      </div>
      <Card
        className={cn('gap-0 py-0 transition-opacity', query.isFetching && 'opacity-70')}
        aria-busy={query.isFetching}
      >
        {children(items)}
      </Card>
      <Pagination meta={pagination} onPageChange={onPageChange} />
    </div>
  );
}
