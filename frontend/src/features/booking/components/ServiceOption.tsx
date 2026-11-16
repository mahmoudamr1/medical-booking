'use client';

import type { ReactNode } from 'react';
import { Clock, MapPin, Video } from 'lucide-react';
import type { Service } from '@/types/api';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

/** Numbered step heading used by the booking flow. */
export function StepTitle({ n, children }: { n: number; children: ReactNode }) {
  const f = useFormat();
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold">
      <span className="flex size-6 items-center justify-center rounded-full bg-accent text-xs text-primary">
        {f.number(n)}
      </span>
      {children}
    </h3>
  );
}

/** Selectable service card (radio semantics). */
export function ServiceOption({
  service,
  selected,
  onSelect,
}: {
  service: Service;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  const f = useFormat();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-start transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        selected ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/50',
      )}
    >
      <span className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-primary' : 'border-input',
          )}
          aria-hidden
        >
          {selected && <span className="size-2 rounded-full bg-primary" />}
        </span>
        <span className="space-y-1">
          <span className="block font-medium">{f.l(service)}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {service.consultation_type === 'online' ? (
                <Video className="size-3.5" aria-hidden />
              ) : (
                <MapPin className="size-3.5" aria-hidden />
              )}
              {service.branch
                ? f.l(service.branch)
                : t(`consultation.${service.consultation_type}`)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {t('common.minutes', { count: f.number(service.duration_minutes) })}
            </span>
          </span>
        </span>
      </span>
      <span className="shrink-0 font-semibold">{f.money(service.price)}</span>
    </button>
  );
}
