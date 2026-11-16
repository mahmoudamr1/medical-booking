import type { ClinicAppointmentFilters, InstantRange } from '../types';

/** Everything a clinic's dashboard caches lives under ['clinic', clinicId, …] (dropped on logout). */
const scope = (clinicId: string) => ['clinic', clinicId] as const;

/**
 * The feature's query keys. `branches`, `services`, `schedules`, `appointments` and `reports`
 * are also the prefixes mutations invalidate.
 */
export const clinicKeys = {
  /** Scope helper for clinic queries. */
  of: (clinicId: string, ...rest: unknown[]) => [...scope(clinicId), ...rest] as const,

  /** Public directory (survives logout). */
  directory: (filters: Record<string, string | number>) => ['public', 'clinics', filters] as const,
  profile: (slug: string) => ['public', 'clinic', slug] as const,

  invitations: ['clinic', 'invitations'] as const,

  manage: (clinicId: string) => [...scope(clinicId), 'manage'] as const,
  branches: (clinicId: string) => [...scope(clinicId), 'branches'] as const,
  staff: (clinicId: string) => [...scope(clinicId), 'staff'] as const,
  doctors: (clinicId: string) => [...scope(clinicId), 'doctors'] as const,
  services: (clinicId: string) => [...scope(clinicId), 'services'] as const,
  activeServices: (clinicId: string) => [...scope(clinicId), 'services', 'active'] as const,
  schedules: (clinicId: string) => [...scope(clinicId), 'schedules'] as const,
  doctorSchedules: (clinicId: string, doctorId: string) =>
    [...scope(clinicId), 'schedules', doctorId] as const,

  appointments: (clinicId: string) => [...scope(clinicId), 'appointments'] as const,
  appointmentList: (clinicId: string, filters: ClinicAppointmentFilters) =>
    [...scope(clinicId), 'appointments', 'list', filters] as const,
  todayAppointments: (clinicId: string, day: string) =>
    [...scope(clinicId), 'appointments', 'today', day] as const,
  pendingCount: (clinicId: string) =>
    [...scope(clinicId), 'appointments', 'pending-count'] as const,
  appointment: (clinicId: string, appointmentId: string) =>
    [...scope(clinicId), 'appointment', appointmentId] as const,

  reports: (clinicId: string) => [...scope(clinicId), 'reports'] as const,
  report: (clinicId: string, range: InstantRange) =>
    [...scope(clinicId), 'reports', range] as const,
};
