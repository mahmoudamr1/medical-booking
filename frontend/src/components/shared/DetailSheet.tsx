'use client';

import type { ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useI18n } from '@/i18n/provider';

/** Side sheet anchored at the inline end (right in LTR, left in RTL), full width on phones. */
export function DetailSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { dir } = useI18n();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={dir === 'rtl' ? 'left' : 'right'}
        className="w-full gap-0 p-0 data-[side=left]:sm:max-w-xl data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="border-b px-5 py-4 pe-14 text-start">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : (
            <SheetDescription className="sr-only">{title}</SheetDescription>
          )}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap gap-2 border-t bg-muted/30 px-5 py-4">{footer}</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
