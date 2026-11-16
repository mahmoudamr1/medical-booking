'use client';

import { cn } from '@/lib/utils';

interface SlotButtonProps {
  label: string;
  /** ISO instant, exposed as data-starts-at for tests/automation. */
  startsAt?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function SlotButton({ label, startsAt, selected, disabled, onClick }: SlotButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={!!selected}
      data-starts-at={startsAt}
      className={cn(
        'h-11 w-full rounded-lg border text-sm font-medium tabular-nums transition-colors sm:h-10',
        'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent',
      )}
    >
      {label}
    </button>
  );
}
