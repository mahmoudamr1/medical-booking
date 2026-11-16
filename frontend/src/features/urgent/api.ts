/**
 * Typed wrappers for the live urgent consultation endpoints, for every role
 * (specs/002-urgent-live-consultation/contracts/urgent-v2.md) + doctor volunteer settings.
 */
import { api } from '@/lib/api/client';
import type {
  AdminUrgentLive,
  AvailabilityPayload,
  AvailableDoctorsFilters,
  AvailableDoctorsResult,
  ClinicUrgentAvailability,
  DoctorUrgentAction,
  DoctorUrgentTab,
  PublicSettings,
  UrgentCreatePayload,
  UrgentMessage,
  UrgentRequest,
  VolunteerProfile,
  VolunteerUpdatePayload,
} from './types';

export const urgentApi = {
  settings: () => api.get<PublicSettings>('/settings/public'),

  // ---- public ----
  /** Doctors available right now (verified, opted in, current window, free capacity). */
  availableDoctors: (filters: AvailableDoctorsFilters = {}) =>
    api.get<AvailableDoctorsResult>('/urgent/available-doctors', { ...filters }),

  // ---- patient ----
  /** 409 `urgent_open_exists`, 429 `rate_limited`, 422 `preferred_doctor_unavailable`. */
  create: (body: UrgentCreatePayload) => api.post<UrgentRequest>('/urgent-requests', body),
  show: (id: string) => api.get<UrgentRequest>(`/urgent-requests/${id}`),
  cancel: (id: string, reason?: string) =>
    api.post<UrgentRequest>(`/urgent-requests/${id}/cancel`, reason ? { reason } : {}),
  patientList: (page: number) => api.page<UrgentRequest>('/patient/urgent-requests', { page }),

  // ---- messages (patient owner or accepted doctor) ----
  /** 409 `not_accepted` before acceptance; 404 for non-participants. */
  messages: (id: string, afterId?: number) =>
    api.get<UrgentMessage[]>(`/urgent-requests/${id}/messages`, { after_id: afterId }),
  /** 409 `not_accepted` / `closed`; throttled 30/min. */
  sendMessage: (id: string, body: string) =>
    api.post<UrgentMessage>(`/urgent-requests/${id}/messages`, { body }),

  // ---- doctor ----
  doctorList: (status: DoctorUrgentTab, page = 1) =>
    api.page<UrgentRequest>('/doctor/urgent-requests', { status, page }),
  respond: (id: string, action: DoctorUrgentAction, reason?: string) =>
    api.post<UrgentRequest>(
      `/urgent-requests/${id}/${action}`,
      action === 'report' ? { reason } : {},
    ),
  /** Completes the consultation with an optional outcome note (≤ 2000 chars). */
  complete: (id: string, outcomeNote?: string) =>
    api.post<UrgentRequest>(
      `/urgent-requests/${id}/complete`,
      outcomeNote ? { outcome_note: outcomeNote } : {},
    ),

  // ---- admin ----
  adminLive: () => api.get<AdminUrgentLive>('/admin/urgent/live'),

  // ---- clinic (clinic.schedules.view) ----
  clinicAvailability: (clinicId: string) =>
    api.get<ClinicUrgentAvailability>(`/clinics/${clinicId}/urgent-availability`),
};

export const volunteerApi = {
  show: () => api.get<VolunteerProfile>('/doctor/volunteer'),
  update: (body: VolunteerUpdatePayload) => api.put<VolunteerProfile>('/doctor/volunteer', body),
  addAvailability: (body: AvailabilityPayload) =>
    api.post<VolunteerProfile>('/doctor/volunteer/availability', body),
  clearAvailability: () => api.delete<VolunteerProfile>('/doctor/volunteer/availability'),
};
