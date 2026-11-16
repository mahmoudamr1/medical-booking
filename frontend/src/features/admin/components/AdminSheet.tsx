'use client';

import type { ReactNode } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/provider';
import { cn } from '@/lib/utils';

/**
 * Side sheet shell of the admin detail views (inline end; full width on phones). The detail
 * renders its own header once loaded; `title` is the accessible name while closed.
 */
export function AdminSheet({
  open,
  onClose,
  title,
  wide = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const { dir } = useI18n();
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={dir === 'rtl' ? 'left' : 'right'}
        className={cn(
          'w-full gap-0 overflow-y-auto data-[side=left]:w-full data-[side=right]:w-full',
          wide
            ? 'data-[side=left]:sm:max-w-2xl data-[side=right]:sm:max-w-2xl'
            : 'data-[side=left]:sm:max-w-xl data-[side=right]:sm:max-w-xl',
        )}
      >
        {open ? children : <SheetTitle className="sr-only">{title}</SheetTitle>}
      </SheetContent>
    </Sheet>
  );
}
