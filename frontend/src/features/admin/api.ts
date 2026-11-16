/** Typed wrappers for /api/v1/admin/* (backend Admin controllers). */
import { api } from '@/lib/api/client';
import type { Appointment } from '@/types/api';
import type { AdminUrgentRequest } from '@/features/urgent';
import type {
  AdminClinic,
  AdminDoctor,
  AdminReview,
  AdminReviewReport,
  AdminSpecialty,
  AdminStats,
  AdminUser,
  AppointmentReport,
  AppointmentsQuery,
  AuditLogEntry,
  AuditLogsQuery,
  ClinicStatus,
  ClinicsQuery,
  DateRange,
  DoctorDecision,
  DoctorsQuery,
  PlatformSettings,
  ReportDecision,
  ReportGroupBy,
  ReportStatus,
  ReviewModeration,
  ReviewReportsQuery,
  ReviewsQuery,
  SpecialtyPayload,
  UrgentRequestsQuery,
  UsersQuery,
  UserStatus,
} from './types';

/** Boolean filters are sent as `1` when on and left out otherwise (`0` would filter the other way). */
const flag = (on: boolean | undefined) => (on ? 1 : undefined);

export const adminApi = {
  stats: (range: DateRange) => api.get<AdminStats>('/admin/stats', range),
  appointmentReport: (query: DateRange & { group_by: ReportGroupBy }) =>
    api.get<AppointmentReport>('/admin/reports/appointments', query),

  doctors: (query: DoctorsQuery) => api.page<AdminDoctor>('/admin/doctors', query),
  doctor: (id: string) => api.get<AdminDoctor>(`/admin/doctors/${id}`),
  decideDoctor: (id: string, decision: DoctorDecision, notes?: string) =>
    api.post<AdminDoctor>(`/admin/doctors/${id}/${decision}`, notes ? { notes } : {}),
  documentUrl: (doctorId: string, documentId: string) =>
    `/api/v1/admin/doctors/${doctorId}/documents/${documentId}/download`,

  users: (query: UsersQuery) => api.page<AdminUser>('/admin/users', query),
  setUserStatus: (id: string, status: UserStatus, reason?: string) =>
    api.put<AdminUser>(`/admin/users/${id}/status`, { status, reason: reason || null }),

  clinics: (query: ClinicsQuery) => api.page<AdminClinic>('/admin/clinics', query),
  setClinicStatus: (id: string, status: ClinicStatus, reason?: string) =>
    api.put<{ id: string; status: ClinicStatus }>(`/admin/clinics/${id}/status`, {
      status,
      reason: reason || null,
    }),

  appointments: (query: AppointmentsQuery) => api.page<Appointment>('/admin/appointments', query),
  /** Admins are authorized on the shared appointment endpoint (AppointmentPolicy). */
  appointment: (id: string) => api.get<Appointment>(`/appointments/${id}`),
  cancelAppointment: (id: string, reason: string) =>
    api.post<Appointment>(`/admin/appointments/${id}/cancel`, { reason }),

  urgentRequests: ({ flagged, ...query }: UrgentRequestsQuery) =>
    api.page<AdminUrgentRequest>('/admin/urgent-requests', { ...query, flagged: flag(flagged) }),
  urgentRequest: (id: string) => api.get<AdminUrgentRequest>(`/admin/urgent-requests/${id}`),

  reviews: ({ reported, ...query }: ReviewsQuery) =>
    api.page<AdminReview>('/admin/reviews', { ...query, reported: flag(reported) }),
  moderateReview: (id: string, action: ReviewModeration, reason?: string) =>
    api.post<AdminReview>(`/admin/reviews/${id}/${action}`, { reason: reason || null }),
  reviewReports: (query: ReviewReportsQuery) =>
    api.page<AdminReviewReport>('/admin/review-reports', query),
  decideReport: (id: string, decision: ReportDecision) =>
    api.post<{ id: string; status: ReportStatus }>(`/admin/review-reports/${id}/${decision}`),

  specialties: () => api.get<AdminSpecialty[]>('/admin/specialties'),
  createSpecialty: (body: SpecialtyPayload) => api.post<AdminSpecialty>('/admin/specialties', body),
  updateSpecialty: (id: string, body: Partial<SpecialtyPayload>) =>
    api.put<AdminSpecialty>(`/admin/specialties/${id}`, body),
  deleteSpecialty: (id: string) => api.delete<null>(`/admin/specialties/${id}`),

  auditLogs: (query: AuditLogsQuery) => api.page<AuditLogEntry>('/admin/audit-logs', query),

  settings: () => api.get<PlatformSettings>('/admin/settings'),
  updateSettings: (body: Partial<PlatformSettings>) =>
    api.put<PlatformSettings>('/admin/settings', body),
};
