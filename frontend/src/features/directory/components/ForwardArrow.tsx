import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * "Forward" arrow that points to the inline end (mirrors in RTL). Inside a `group` it nudges forward
 * on hover.
 */
export function ForwardArrow({ className }: { className?: string }) {
  return (
    <ArrowRight
      className={cn(
        'size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none rtl:rotate-180 rtl:group-hover:-translate-x-0.5',
        className,
      )}
      aria-hidden
    />
  );
}
