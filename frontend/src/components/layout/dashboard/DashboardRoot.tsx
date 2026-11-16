'use client';

import type { ReactNode } from 'react';
import { useT } from '@/i18n/provider';

/**
 * Frame for everything under /dashboard. Each area renders its own <DashboardShell>
 * (sidebar, app bar, <main id="main">) instead of the public header and footer.
 */
export function DashboardRoot({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow-md"
      >
        {t('common.skipToContent')}
      </a>
      {children}
    </div>
  );
}
