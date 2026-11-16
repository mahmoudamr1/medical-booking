'use client';

import type { BranchHours } from '@/types/api';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { WEEK_ORDER } from '../hooks/useClinicData';

/** Compact weekly opening hours table; days without ranges show "closed". */
export function BranchHoursList({
  hours,
  className,
}: {
  hours: BranchHours[] | undefined;
  className?: string;
}) {
  const t = useT();
  const f = useFormat();
  if (!hours || hours.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        {t('clinic.profile.noHours')}
      </p>
    );
  }
  return (
    <dl className={cn('grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm', className)}>
      {WEEK_ORDER.map((day) => {
        const ranges = hours
          .filter((h) => h.day_of_week === day)
          .sort((a, b) => a.opens_at.localeCompare(b.opens_at));
        return (
          <div key={day} className="contents">
            <dt className="text-muted-foreground">{f.weekday(day)}</dt>
            <dd className={cn('tabular-nums', ranges.length === 0 && 'text-muted-foreground')}>
              {ranges.length === 0 ? (
                t('clinic.profile.closed')
              ) : (
                <span dir="ltr">
                  {ranges.map((r) => `${r.opens_at}–${r.closes_at}`).join(' · ')}
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
