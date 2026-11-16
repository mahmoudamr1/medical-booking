'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Direction } from 'radix-ui';
import { useState, type ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LayoutSlotsProvider } from '@/components/layout/LayoutSlots';
import { NotificationBell } from '@/features/notifications';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { I18nProvider, useI18n } from '@/i18n/provider';
import { isApiError } from '@/lib/api/client';
import type { Locale } from '@/types/api';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        // Client errors (4xx) are final; retry transient failures only.
        retry: (count, error) =>
          !(isApiError(error) && error.status >= 400 && error.status < 500) && count < 2,
      },
    },
  });
}

/** Radix primitives (menus, selects, sheets) read direction from context, not from <html dir>. */
function DirectionBridge({ children }: { children: ReactNode }) {
  const { dir } = useI18n();
  return (
    <Direction.Provider dir={dir}>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster position="top-center" dir={dir} richColors={false} closeButton />
      </TooltipProvider>
    </Direction.Provider>
  );
}

export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <I18nProvider initialLocale={locale}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DirectionBridge>
            <LayoutSlotsProvider notifications={<NotificationBell />}>
              {children}
            </LayoutSlotsProvider>
          </DirectionBridge>
        </AuthProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}
