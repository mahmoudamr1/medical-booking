import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from './label';
import { Textarea as ShadTextarea } from './textarea';

/**
 * Form helpers that work with react-hook-form's `register` (native inputs) and share the
 * shadcn visual language. Label + control + hint/error with aria wiring.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor: string;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('grid gap-2', className)} data-invalid={error ? true : undefined}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export const Textarea = ShadTextarea;

/**
 * Native <select> (works with `register`, great on phones) with a consistent lucide chevron at the
 * inline end (RTL-aware) and an optional leading icon. `className` styles the wrapper (width, margins),
 * `selectClassName` the control itself (height etc.).
 */
export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    selectClassName?: string;
    icon?: React.ReactNode;
  }
>(({ className, selectClassName, icon, children, ...props }, ref) => (
  <div className={cn('group/select relative w-full min-w-0', className)}>
    {icon && (
      <span
        className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-muted-foreground [&_svg]:size-4"
        aria-hidden
      >
        {icon}
      </span>
    )}
    <select
      ref={ref}
      className={cn(
        'h-11 w-full min-w-0 cursor-pointer appearance-none truncate rounded-lg border border-input bg-card pe-10 text-base transition-colors outline-none sm:h-10 md:text-sm',
        icon ? 'ps-9' : 'ps-3',
        'hover:border-slate-400 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive',
        selectClassName,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/select:text-primary"
      strokeWidth={2}
      aria-hidden
    />
  </div>
));
NativeSelect.displayName = 'NativeSelect';

/** Native checkbox (works with `register`) styled to match shadcn. */
export const CheckboxField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label: React.ReactNode;
    id: string;
    description?: React.ReactNode;
  }
>(({ label, id, description, className, ...props }, ref) => (
  <div className={cn('flex items-start gap-3', className)}>
    <input
      ref={ref}
      id={id}
      type="checkbox"
      className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-input accent-primary sm:size-4"
      {...props}
    />
    <div className="grid gap-0.5">
      <label htmlFor={id} className="cursor-pointer text-sm leading-snug text-foreground">
        {label}
      </label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  </div>
));
CheckboxField.displayName = 'CheckboxField';
