import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const LAYOUTS = {
  stack: 'space-y-8',
  /** Two equal columns from `lg` up (text beside an illustration). */
  split: 'grid items-center gap-10 lg:grid-cols-2 lg:gap-16',
} as const;

/** Full-width page section with the standard vertical rhythm; content sits in the page container. */
export function Band({
  children,
  layout = 'stack',
  className,
}: {
  children: ReactNode;
  layout?: keyof typeof LAYOUTS;
  /** Section surface, e.g. `border-y bg-card` for a tinted band. */
  className?: string;
}) {
  return (
    <section className={cn('py-12 sm:py-16', className)}>
      <div className={cn('container-page', LAYOUTS[layout])}>{children}</div>
    </section>
  );
}
