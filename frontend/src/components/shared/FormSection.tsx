'use client';

import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Card section with a title/description column and the form controls beside it on wide screens
 * (stacked on phones). Used by every doctor settings page for a consistent form layout.
 */
export function FormSection({
  title,
  description,
  children,
  aside,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('gap-0 py-0', className)}>
      <CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
          {aside}
        </div>
        <div className="min-w-0">{children}</div>
      </CardContent>
    </Card>
  );
}
