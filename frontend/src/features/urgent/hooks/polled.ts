/**
 * Query options for a polled query: refetches every `ms` while `active` and never while the tab
 * is hidden (TanStack Query checks page visibility before each interval tick).
 */
export function polled(ms: number, active = true) {
  return { refetchInterval: active ? ms : false, refetchIntervalInBackground: false } as const;
}
