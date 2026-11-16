import type { DateRange, ReportGroupBy } from '../types';

/** An area root such as `adminKeys.users`. */
export type AdminKeyRoot = readonly ['admin', string];

/**
 * The admin feature's one query-key set. Everything sits under ['admin', …] (dropped on logout);
 * the area roots are what mutations invalidate, `list`/`detail` build the keys below a root.
 */
export const adminKeys = {
  all: ['admin'] as const,
  stats: ['admin', 'stats'] as const,
  doctors: ['admin', 'doctors'] as const,
  users: ['admin', 'users'] as const,
  clinics: ['admin', 'clinics'] as const,
  appointments: ['admin', 'appointments'] as const,
  urgent: ['admin', 'urgent'] as const,
  reviews: ['admin', 'reviews'] as const,
  reports: ['admin', 'review-reports'] as const,
  specialties: ['admin', 'specialties'] as const,
  audit: ['admin', 'audit'] as const,
  settings: ['admin', 'settings'] as const,

  list: (root: AdminKeyRoot, query: object) => [...root, 'list', query] as const,
  detail: (root: AdminKeyRoot, id: string) => [...root, 'detail', id] as const,
  /** The nav badges and the overview's default range share `statsFor({})` → one request. */
  statsFor: (range: DateRange) => ['admin', 'stats', range] as const,
  report: (groupBy: ReportGroupBy, range: DateRange) =>
    ['admin', 'stats', 'report', groupBy, range] as const,
};
