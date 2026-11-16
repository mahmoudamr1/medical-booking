'use client';

import { ErrorState, Skeleton } from '@/components/shared/states';
import { useSpecialties } from '@/features/directory';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

export const MAX_SPECIALTIES = 5;

/** Checkbox grid of specialties a volunteer accepts (up to five; GP marked). */
export function SpecialtyChecklist({
  selected,
  onChange,
  disabled,
  error,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
  error?: string;
}) {
  const t = useT();
  const f = useFormat();
  const specialties = useSpecialties();
  const toggle = (id: string, on: boolean) =>
    onChange(on ? [...selected, id].slice(0, MAX_SPECIALTIES) : selected.filter((x) => x !== id));

  return (
    <fieldset disabled={disabled} className={cn('space-y-2', disabled && 'opacity-60')}>
      <legend className="sr-only">{t('doctorUrgent.volunteer.specialties')}</legend>
      {specialties.isPending ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : specialties.isError ? (
        <ErrorState error={specialties.error} onRetry={() => specialties.refetch()} />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {specialties.data.map((s) => {
            const checked = selected.includes(s.id);
            const full = !checked && selected.length >= MAX_SPECIALTIES;
            return (
              <label
                key={s.id}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 text-sm',
                  checked ? 'border-primary bg-accent' : 'hover:bg-muted/60',
                  full && 'cursor-not-allowed opacity-50',
                )}
              >
                <Checkbox
                  checked={checked}
                  disabled={disabled || full}
                  onCheckedChange={(val) => toggle(s.id, val === true)}
                />
                <span className="min-w-0 truncate">{f.l(s)}</span>
                {s.is_general_practice && (
                  <Badge variant="muted" className="ms-auto">
                    {t('doctorUrgent.volunteer.gp')}
                  </Badge>
                )}
              </label>
            );
          })}
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
