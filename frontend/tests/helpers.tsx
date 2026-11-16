import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { I18nProvider } from '@/i18n/provider';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import type { Locale } from '@/types/api';

export function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export const ok = <T,>(data: T, extra: Record<string, unknown> = {}) => ({
  success: true,
  message: 'ok',
  data,
  ...extra,
});

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

/** Installs a fetch mock that routes by "METHOD path" (query string ignored unless included in the key). */
export function mockFetch(routes: Record<string, Handler>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init.method ?? 'GET').toUpperCase();
    const path = url.split('?')[0];
    const handler = routes[`${method} ${url}`] ?? routes[`${method} ${path}`];
    if (!handler) throw new Error(`Unmocked request: ${method} ${url}`);
    return handler(url, init);
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

export function renderWithProviders(ui: ReactElement, { locale = 'en' as Locale } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider initialLocale={locale}>
      <QueryClientProvider client={client}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
  return { client, ...render(ui, { wrapper: Wrapper }) };
}
