/**
 * Doctor self-service query keys (under ['doctor', …], dropped on logout). A list key is a prefix
 * of its ranged/paged variants, so invalidating the list refreshes every variant.
 */
export const doctorKeys = {
  all: ['doctor'] as const,
  dashboard: ['doctor', 'dashboard'] as const,
  profile: ['doctor', 'profile'] as const,
  branches: ['doctor', 'branches'] as const,
  services: ['doctor', 'services'] as const,
  schedules: ['doctor', 'schedules'] as const,
  /** Upcoming exceptions (today onwards). */
  exceptions: ['doctor', 'exceptions'] as const,
  /** Exceptions of a calendar range, past days included. */
  exceptionRange: (from: string, to: string) => ['doctor', 'exceptions', from, to] as const,
  documents: ['doctor', 'documents'] as const,
  preferences: ['doctor', 'preferences'] as const,
  appointments: ['doctor', 'appointments'] as const,
  calendar: (from: string, to: string, status: string) =>
    ['doctor', 'appointments', 'calendar', from, to, status] as const,
  pending: (from: string, page: number) =>
    ['doctor', 'appointments', 'pending-panel', from, page] as const,
};
