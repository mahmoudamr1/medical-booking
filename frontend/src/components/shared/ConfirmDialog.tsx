'use client';

import { useState, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/form';
import { useT } from '@/i18n/provider';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  /** Error message to show inside the dialog (e.g. a policy violation from the API). */
  error?: string | null;
  /** Show a reason textarea; `required` blocks confirm until filled. */
  reason?: { label: string; placeholder?: string; required?: boolean; maxLength?: number };
  onConfirm: (reason: string) => void;
  children?: ReactNode;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const { open, onOpenChange, pending } = props;
  return (
    <AlertDialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      {/* Content unmounts when closed, so the reason text resets automatically. */}
      <AlertDialogContent className="data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-lg">
        <ConfirmBody {...props} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ConfirmBody({
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  pending,
  error,
  reason,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const t = useT();
  const [text, setText] = useState('');
  const blocked = !!reason?.required && text.trim().length === 0;

  return (
    <>
      <AlertDialogHeader className="text-start sm:text-start">
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {description && (
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        )}
      </AlertDialogHeader>
      {children}
      {reason && (
        <Field label={reason.label} htmlFor="confirm-reason" required={reason.required}>
          <Textarea
            id="confirm-reason"
            value={text}
            maxLength={reason.maxLength ?? 500}
            placeholder={reason.placeholder}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <AlertDialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
          {t('common.cancel')}
        </Button>
        <Button
          variant={destructive ? 'danger' : 'default'}
          onClick={() => onConfirm(text.trim())}
          disabled={pending || blocked}
        >
          {pending ? t('common.saving') : (confirmLabel ?? t('common.confirm'))}
        </Button>
      </AlertDialogFooter>
    </>
  );
}
