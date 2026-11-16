'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton as UiSkeleton } from '@/components/ui/skeleton';
import { useT } from '@/i18n/provider';
import { errorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <UiSkeleton className={cn('bg-slate-200/70', className)} />;
}

/** Spinner, or `rows` card-shaped skeletons for lists. */
export function LoadingState({
  label,
  className,
  rows,
}: {
  label?: string;
  className?: string;
  rows?: number;
}) {
  const t = useT();
  if (rows) {
    return (
      <div
        className={cn('grid gap-3', className)}
        role="status"
        aria-label={label ?? t('common.loading')}
      >
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-center gap-2 py-12 text-muted-foreground',
        className,
      )}
    >
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title,
  className,
}: {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  const t = useT();
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50/60 px-6 py-10 text-center',
        className,
      )}
    >
      <AlertTriangle className="size-8 text-destructive" aria-hidden />
      <p className="font-semibold text-foreground">{title ?? t('errors.loadFailed')}</p>
      {error !== undefined && (
        <p className="max-w-md text-sm text-muted-foreground">{errorMessage(error, t)}</p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden />
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

/** Titled card section. */
export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 px-(--card-spacing)">
          <div className="space-y-1">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
