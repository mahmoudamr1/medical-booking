'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { StatGrid } from '@/components/shared/StatCard';
import { useFormat } from '@/i18n/provider';
import { cn } from '@/lib/utils';

export function StatGroup({
  title,
  children,
  cols = 'lg:grid-cols-3',
}: {
  title: string;
  children: ReactNode;
  cols?: string;
}) {
  return (
    <StatGrid title={title} cols={cn('grid-cols-2', cols)}>
      {children}
    </StatGrid>
  );
}

export function QuickLink({ href, count, label }: { href: string; count: number; label: string }) {
  const f = useFormat();
  if (count <= 0) return null;
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-medium text-foreground ring-1 ring-amber-200 transition-colors hover:bg-amber-100"
    >
      <span className="inline-flex min-w-6 justify-center rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white tabular-nums">
        {f.number(count)}
      </span>
      {label}
      <ChevronLeft className="size-4 ltr:rotate-180" aria-hidden />
    </Link>
  );
}
