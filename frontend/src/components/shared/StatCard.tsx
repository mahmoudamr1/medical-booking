'use client';

import { isValidElement, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useFormat } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const TONES = {
  primary: 'bg-accent text-primary ring-primary/10',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  danger: 'bg-red-50 text-red-700 ring-red-600/10',
  muted: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/10',
} as const;

type StatTone = keyof typeof TONES;

/**
 * Dashboard statistic tile: tinted icon, label, value, and an optional delta or sub-label.
 * With `href` the whole tile is a link (hover lifts the shadow).
 */
export function StatCard({
  label,
  value,
  icon,
  tone = 'primary',
  hint,
  delta,
  href,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon | ReactNode;
  tone?: StatTone;
  /** Sub-label under the value (may contain a link when the card has no href). */
  hint?: ReactNode;
  /** Change against a previous period, e.g. +12 (%). Positive is shown green unless `deltaInverted`. */
  delta?: { value: number; suffix?: string; inverted?: boolean; label?: string };
  href?: string;
  className?: string;
}) {
  const f = useFormat();
  const Icon =
    icon && !isValidElement(icon) && typeof icon !== 'string' ? (icon as LucideIcon) : null;
  const iconNode = Icon ? <Icon aria-hidden /> : (icon as ReactNode);
  const good = delta ? (delta.inverted ? delta.value < 0 : delta.value > 0) : false;

  const content = (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:gap-3.5">
      {iconNode && (
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 sm:size-11 sm:rounded-xl [&_svg]:size-[18px] sm:[&_svg]:size-5',
            TONES[tone],
          )}
        >
          {iconNode}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground sm:truncate sm:text-sm">
          {label}
        </p>
        <p className="mt-0.5 text-xl leading-tight font-semibold text-foreground tabular-nums sm:text-2xl">
          {value}
        </p>
        {(delta || hint) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {delta && delta.value !== 0 && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 font-medium',
                  good ? 'text-emerald-700' : 'text-red-700',
                )}
              >
                {delta.value > 0 ? (
                  <ArrowUpRight className="size-3.5" aria-hidden />
                ) : (
                  <ArrowDownRight className="size-3.5" aria-hidden />
                )}
                {f.number(Math.abs(delta.value))}
                {delta.suffix}
              </span>
            )}
            {delta?.label && <span>{delta.label}</span>}
            {hint && <span className="min-w-0">{hint}</span>}
          </div>
        )}
      </div>
    </div>
  );

  const cardCls = cn(
    'gap-0 px-3.5 py-3.5 transition-[box-shadow,transform] duration-150 motion-reduce:transition-none sm:px-5',
    href && 'hover:shadow-md hover:shadow-slate-900/5 hover:ring-primary/25',
    className,
  );

  if (href) {
    return (
      <Card className={cn(cardCls, 'relative focus-within:ring-2 focus-within:ring-ring')}>
        <Link
          href={href}
          className="absolute inset-0 z-0 rounded-xl outline-none"
          aria-label={label}
        />
        <div className="pointer-events-none relative">{content}</div>
      </Card>
    );
  }
  return <Card className={cardCls}>{content}</Card>;
}

/** A labelled group of stat cards with a responsive grid. */
export function StatGrid({
  title,
  children,
  className,
  cols = 'sm:grid-cols-2 xl:grid-cols-3',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  cols?: string;
}) {
  return (
    <section className={cn('space-y-3', className)} aria-label={title}>
      {title && <h2 className="text-sm font-semibold text-slate-600">{title}</h2>}
      <div className={cn('grid grid-cols-1 gap-3', cols)}>{children}</div>
    </section>
  );
}
