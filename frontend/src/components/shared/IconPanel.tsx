import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Photo-free illustration: a brand-tinted surface with a soft dot grid, a large icon tile and a few
 * labelled "chips". Purely decorative (aria-hidden) — the surrounding section carries the meaning.
 */
export function IconPanel({
  icon: Icon,
  chips = [],
  tone = 'primary',
  className,
}: {
  icon: LucideIcon;
  chips?: { icon: LucideIcon; label: string }[];
  tone?: 'primary' | 'danger';
  className?: string;
}) {
  const danger = tone === 'danger';
  return (
    <div
      aria-hidden
      className={cn(
        'relative isolate flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border p-8',
        danger ? 'border-red-200 bg-red-100/60' : 'bg-accent',
        className,
      )}
    >
      <div
        className={cn(
          'absolute inset-0 -z-10 [background-size:20px_20px] opacity-60',
          danger
            ? '[background-image:radial-gradient(oklch(0.8_0.08_25)_1px,transparent_1px)]'
            : '[background-image:radial-gradient(oklch(0.82_0.05_185)_1px,transparent_1px)]',
        )}
      />
      <div
        className={cn(
          'absolute -end-16 -top-16 -z-10 size-56 rounded-full',
          danger ? 'bg-red-200/60' : 'bg-primary/10',
        )}
      />
      <div
        className={cn(
          'absolute -start-12 -bottom-20 -z-10 size-64 rounded-full',
          danger ? 'bg-red-200/40' : 'bg-emerald-200/40',
        )}
      />

      <div className="flex flex-col items-center gap-6">
        <span
          className={cn(
            'flex size-24 items-center justify-center rounded-3xl shadow-sm ring-1',
            danger ? 'bg-white text-red-600 ring-red-200' : 'bg-card text-primary ring-border',
          )}
        >
          <Icon className="size-12" strokeWidth={1.5} />
        </span>
        {chips.length > 0 && (
          <ul className="flex max-w-sm flex-wrap justify-center gap-2">
            {chips.map(({ icon: ChipIcon, label }, i) => (
              <li
                key={`${i}-${label}`}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium shadow-sm ring-1',
                  danger
                    ? 'bg-white text-red-800 ring-red-200'
                    : 'bg-card text-foreground ring-border',
                )}
              >
                <ChipIcon className={cn('size-4', danger ? 'text-red-600' : 'text-primary')} />
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
