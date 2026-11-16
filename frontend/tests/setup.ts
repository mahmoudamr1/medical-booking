import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Next.js navigation hooks are not available outside the app router; tests get controllable stubs.
export const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/doctor/doc-1',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

export function clearCookies(): void {
  for (const c of document.cookie.split('; ')) {
    const name = c.split('=')[0];
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}

afterEach(() => {
  cleanup();
  clearCookies();
  vi.unstubAllGlobals();
  routerMock.push.mockReset();
  routerMock.replace.mockReset();
  routerMock.refresh.mockReset();
});
