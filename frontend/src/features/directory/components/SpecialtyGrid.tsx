'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { Specialty } from '@/types/api';
import { SpecialtyCard } from './SpecialtyCard';

const VARIANTS = {
  /** Home teaser: names only, four per row. */
  compact: { columns: 'lg:grid-cols-4', placeholders: 8, placeholder: 'h-20' },
  /** Full list: with descriptions, three per row. */
  detailed: { columns: 'lg:grid-cols-3', placeholders: 9, placeholder: 'h-24' },
} as const;

/** Grid of specialty links with its loading, error (retry) and empty states. */
export function SpecialtyGrid({
  specialties,
  loading,
  error,
  onRetry,
  variant = 'compact',
}: {
  specialties: Specialty[];
  loading: boolean;
  /** The failed request's error; `null`/`undefined` when it succeeded. */
  error?: unknown;
  onRetry?: () => void;
  variant?: keyof typeof VARIANTS;
}) {
  const t = useT();
  const { columns, placeholders, placeholder } = VARIANTS[variant];
  const grid = cn('grid grid-cols-1 gap-3 sm:grid-cols-2', columns);

  if (loading) {
    return (
      <div className={grid} role="status" aria-label={t('common.loading')}>
        {Array.from({ length: placeholders }, (_, i) => (
          <Skeleton key={i} className={cn('rounded-xl', placeholder)} />
        ))}
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (specialties.length === 0) return <EmptyState title={t('specialties.empty')} />;
  return (
    <ul className={grid}>
      {specialties.map((specialty) => (
        <li key={specialty.id}>
          <SpecialtyCard specialty={specialty} showDescription={variant === 'detailed'} />
        </li>
      ))}
    </ul>
  );
}
