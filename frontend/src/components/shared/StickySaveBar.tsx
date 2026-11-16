'use client';

import type { ReactNode } from 'react';
import { CircleCheck, CircleDot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

/**
 * Save bar that sticks to the bottom of the viewport while the form is on screen.
 * Shows a dirty/clean indicator and Save (+ optional Discard).
 */
export function StickySaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  saveLabel,
  disabled,
  form,
  extra,
}: {
  dirty: boolean;
  saving: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  saveLabel?: string;
  disabled?: boolean;
  /** Associates the save button with a <form id>. When set, the button submits that form. */
  form?: string;
  extra?: ReactNode;
}) {
  const t = useT();
  return (
    <div
      className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 -mx-1 pt-2 pb-2 md:bottom-0"
      data-testid="sticky-save-bar"
    >
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85',
          dirty && 'border-primary/40',
        )}
      >
        <p
          className={cn(
            'flex items-center gap-2 text-sm',
            dirty ? 'font-medium text-foreground' : 'text-muted-foreground',
          )}
          aria-live="polite"
        >
          {dirty ? (
            <CircleDot className="size-4 text-primary" aria-hidden />
          ) : (
            <CircleCheck className="size-4 text-emerald-600" aria-hidden />
          )}
          {dirty ? t('common.form.unsaved') : t('common.form.allSaved')}
        </p>
        <div className="flex flex-1 flex-wrap justify-end gap-2">
          {extra}
          {onDiscard && (
            <Button type="button" variant="ghost" onClick={onDiscard} disabled={!dirty || saving}>
              {t('common.form.discard')}
            </Button>
          )}
          <Button
            type={form ? 'submit' : 'button'}
            form={form}
            onClick={form ? undefined : onSave}
            disabled={saving || disabled}
            className="min-w-32"
          >
            {saving && <Loader2 className="animate-spin" aria-hidden />}
            {saving ? t('common.saving') : (saveLabel ?? t('common.save'))}
          </Button>
        </div>
      </div>
    </div>
  );
}
