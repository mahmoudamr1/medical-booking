'use client';
import { Star } from 'lucide-react';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

export function Stars({ value, className }: { value: number; className?: string }) {
  const t = useT();
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      role="img"
      aria-label={t('reviews.starsLabel', { value })}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            'size-4',
            i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300',
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}
