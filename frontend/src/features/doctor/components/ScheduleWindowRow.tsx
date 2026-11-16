'use client';

import { Clock, Plus, Trash2 } from 'lucide-react';
import type { Branch } from '@/types/api';
import type { ScheduleWindow } from '../types';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const MAX_BREAKS = 5;

/** One working window: location (branch or online), from/to and up to five breaks. */
export function ScheduleWindowRow({
  window: r,
  branches,
  error,
  onChange,
  onRemove,
}: {
  window: ScheduleWindow;
  branches: Branch[];
  error?: string;
  onChange: (patch: Partial<ScheduleWindow>) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const f = useFormat();
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        error ? 'border-destructive/60 bg-red-50/40' : 'border-border',
      )}
      data-testid="schedule-window"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] sm:items-end">
        <label className="col-span-2 grid gap-1 text-xs text-muted-foreground sm:col-span-1">
          {t('doctorDash.location')}
          <NativeSelect
            value={r.clinic_branch_id ?? ''}
            onChange={(e) => onChange({ clinic_branch_id: e.target.value || null })}
          >
            <option value="">{t('doctorDash.onlineLocation')}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {[f.l(b.clinic), f.l(b)].filter(Boolean).join(' – ')}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          {t('common.from')}
          <Input
            type="time"
            className="h-11 sm:h-10"
            value={r.starts_at}
            onChange={(e) => onChange({ starts_at: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          {t('common.to')}
          <Input
            type="time"
            className="h-11 sm:h-10"
            value={r.ends_at}
            onChange={(e) => onChange({ ends_at: e.target.value })}
          />
        </label>
        <Button
          variant="ghost"
          size="icon"
          className="col-span-2 justify-self-end sm:col-span-1"
          aria-label={t('common.delete')}
          onClick={onRemove}
        >
          <Trash2 className="text-destructive" />
        </Button>
      </div>
      <div className="mt-2 space-y-2">
        {r.breaks.map((b, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-sm"
          >
            <Clock className="size-3.5 text-muted-foreground" aria-hidden />
            <span className="text-muted-foreground">{t('doctorDash.break')}</span>
            <Input
              type="time"
              aria-label={`${t('doctorDash.break')} ${t('common.from')}`}
              className="h-10 w-32 sm:h-9"
              value={b.starts_at}
              onChange={(e) =>
                onChange({
                  breaks: r.breaks.map((x, j) =>
                    j === i ? { ...x, starts_at: e.target.value } : x,
                  ),
                })
              }
            />
            <Input
              type="time"
              aria-label={`${t('doctorDash.break')} ${t('common.to')}`}
              className="h-10 w-32 sm:h-9"
              value={b.ends_at}
              onChange={(e) =>
                onChange({
                  breaks: r.breaks.map((x, j) => (j === i ? { ...x, ends_at: e.target.value } : x)),
                })
              }
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="ms-auto"
              aria-label={t('common.delete')}
              onClick={() => onChange({ breaks: r.breaks.filter((_, j) => j !== i) })}
            >
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        ))}
        {r.breaks.length < MAX_BREAKS && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() =>
              onChange({ breaks: [...r.breaks, { starts_at: '13:00', ends_at: '14:00' }] })
            }
          >
            <Plus aria-hidden />
            {t('doctorDash.addBreak')}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
