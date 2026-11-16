'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

interface Crumb {
  label: ReactNode;
  href?: string;
}

/**
 * Page title row for dashboard pages: optional breadcrumbs (for detail pages — the shell's top
 * bar already shows Area › Section), an h1, a description and primary actions. Actions wrap under
 * the title on narrow screens.
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  eyebrow,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  /** Small line above the title (e.g. the clinic name). */
  eyebrow?: ReactNode;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={cn('space-y-2', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label={t('dashboard.breadcrumb')}>
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((c, i) => (
              <li key={i} className="flex min-w-0 items-center gap-1">
                {i > 0 && (
                  <ChevronRight
                    className="size-3.5 shrink-0 text-slate-400 rtl:rotate-180"
                    aria-hidden
                  />
                )}
                {c.href ? (
                  <Link
                    href={c.href}
                    className="truncate rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className="truncate text-foreground" aria-current="page">
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          {eyebrow && (
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">{eyebrow}</p>
          )}
          <h1 className="text-[1.375rem] leading-tight font-semibold text-balance sm:text-[1.75rem]">
            {title}
          </h1>
          {description && (
            <p className="max-w-3xl text-sm text-pretty text-muted-foreground sm:text-[15px]">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 [&>*]:max-sm:flex-1">{actions}</div>
        )}
      </div>
    </div>
  );
}
