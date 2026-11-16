'use client';

import type { LucideIcon } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';

export interface Choice {
  value: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Accent for the checked state and icon. */
  tone?: 'primary' | 'rose' | 'amber' | 'sky';
}

const TONE = {
  primary: 'text-primary has-checked:border-primary has-checked:bg-accent',
  rose: 'text-rose-700 has-checked:border-rose-400 has-checked:bg-rose-50',
  amber: 'text-amber-700 has-checked:border-amber-400 has-checked:bg-amber-50',
  sky: 'text-sky-700 has-checked:border-sky-400 has-checked:bg-sky-50',
} as const;

/** Radio group rendered as large tappable cards (works with react-hook-form `register`). */
export function ChoiceCards({
  legend,
  hint,
  choices,
  registration,
  error,
  columns = 2,
}: {
  legend: string;
  hint?: string;
  choices: Choice[];
  registration: UseFormRegisterReturn;
  error?: string;
  columns?: 2 | 3;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium text-foreground">
        {legend}
        <span className="text-destructive" aria-hidden>
          *
        </span>
      </legend>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className={cn('grid gap-3', columns === 3 ? 'md:grid-cols-3' : 'sm:grid-cols-2')}>
        {choices.map(({ value, label, hint: choiceHint, icon: Icon, tone = 'primary' }) => (
          <label
            key={value}
            className={cn(
              'flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 transition-colors',
              'hover:border-slate-400 has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
              TONE[tone],
            )}
          >
            <input
              type="radio"
              value={value}
              className="mt-1 size-4 shrink-0 accent-current"
              {...registration}
            />
            <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span className="grid gap-0.5">
              <span className="font-medium text-foreground">{label}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">{choiceHint}</span>
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
