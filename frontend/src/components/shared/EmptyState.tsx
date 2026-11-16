'use client';

import { isValidElement, type ReactNode } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Friendly empty / blocked state: a lucide icon on layered soft circles, a title, a hint and an
 * optional action. `tone="danger"` is for forbidden states.
 */
export function EmptyState({
  title,
  description,
  icon = Inbox,
  action,
  tone = 'primary',
  className,
  compact = false,
}: {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon | ReactNode;
  action?: ReactNode;
  tone?: 'primary' | 'danger' | 'muted';
  className?: string;
  /** Smaller padding for use inside cards. */
  compact?: boolean;
}) {
  const Icon =
    icon && !isValidElement(icon) && typeof icon !== 'string' ? (icon as LucideIcon) : null;
  const ring =
    tone === 'danger'
      ? 'bg-red-50 text-red-600 ring-red-100'
      : tone === 'muted'
        ? 'bg-slate-100 text-slate-500 ring-slate-200/70'
        : 'bg-accent text-primary ring-primary/10';
  const halo =
    tone === 'danger' ? 'bg-red-50/60' : tone === 'muted' ? 'bg-slate-100/60' : 'bg-accent/70';
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300/80 bg-card text-center',
        compact ? 'px-4 py-8' : 'px-6 py-12 sm:py-16',
        className,
      )}
    >
      <div className="relative flex size-20 items-center justify-center" aria-hidden>
        <span className={cn('absolute inset-0 rounded-full', halo)} />
        <span
          className={cn(
            'relative flex size-14 items-center justify-center rounded-2xl shadow-sm ring-1 [&_svg]:size-7',
            ring,
          )}
        >
          {Icon ? <Icon strokeWidth={1.75} /> : (icon as ReactNode)}
        </span>
      </div>
      <p className="mt-2 text-base font-semibold text-foreground">{title}</p>
      {description && (
        <p className="max-w-md text-sm text-pretty text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
