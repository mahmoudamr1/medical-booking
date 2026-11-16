'use client';

import { type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---- Detail helpers --------------------------------------------------------------------

export function DetailList({
  rows,
  className,
}: {
  rows: [ReactNode, ReactNode][];
  className?: string;
}) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-3 sm:grid-cols-2', className)}>
      {rows.map(([label, value], i) => (
        <div key={i} className="min-w-0 space-y-0.5">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="text-sm font-medium break-words text-foreground">
            {value === null || value === undefined || value === '' ? '—' : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Pretty-printed JSON in a native <details> (keyboard accessible, no state). */
export function JsonDetails({ value, summary }: { value: unknown; summary: string }) {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'object' && Object.keys(value as object).length === 0)
  ) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <details className="group max-w-md">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-primary hover:underline">
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
        {summary}
      </summary>
      <pre
        dir="ltr"
        className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-start font-mono text-xs leading-relaxed break-all whitespace-pre-wrap"
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}
