/** Typed wrappers for the clinic endpoints (backend/routes/api/v1/clinic.php and public.php). */
import { api } from '@/lib/api/client';
import type { Appointment, AppointmentAction, Branch, Service } from '@/types/api';
import type {
  AffiliateDoctorPayload,
  BookOnBehalfPayload,
  BranchHoursPayload,
  BranchPayload,
  ClinicAffiliation,
  ClinicAppointmentFilters,
  ClinicCreatePayload,
  ClinicDetailsPayload,
  ClinicDirectoryParams,
  ClinicInvitation,
  ClinicManage,
  ClinicPublic,
  ClinicReport,
  ClinicScheduleWindow,
  ClinicSummary,
  InstantRange,
  InvitationDecision,
  InviteStaffPayload,
  StaffMember,
  StaffUpdatePayload,
} from './types';

export const clinicDirectoryApi = {
  list: (params: ClinicDirectoryParams) => api.page<ClinicSummary>('/clinics', params),
  show: (slug: string) => api.get<ClinicPublic>(`/clinics/${encodeURIComponent(slug)}`),
};

const base = (clinicId: string) => `/clinics/${clinicId}`;

export const clinicApi = {
  // ---- signed-in user ----
  invitations: () => api.get<ClinicInvitation[]>('/my/invitations'),
  respondInvitation: (id: string, decision: InvitationDecision) =>
    api.post<null>(`/my/invitations/${id}/${decision}`),

  // ---- organization ----
  /** Creates an organization; the caller becomes its owner. */
  create: (body: ClinicCreatePayload) => api.post<ClinicManage>('/clinics', body),
  manage: (c: string) => api.get<ClinicManage>(`${base(c)}/manage`),
  updateManage: (c: string, body: ClinicDetailsPayload) =>
    api.put<ClinicManage>(`${base(c)}/manage`, body),

  // ---- branches ----
  branches: (c: string) => api.get<Branch[]>(`${base(c)}/branches`),
  createBranch: (c: string, body: BranchPayload) => api.post<Branch>(`${base(c)}/branches`, body),
  updateBranch: (c: string, id: string, body: BranchPayload) =>
    api.put<Branch>(`${base(c)}/branches/${id}`, body),
  deleteBranch: (c: string, id: string) => api.delete<null>(`${base(c)}/branches/${id}`),
  saveHours: (c: string, id: string, hours: BranchHoursPayload) =>
    api.put<Branch>(`${base(c)}/branches/${id}/hours`, { hours }),

  // ---- staff ----
  staff: (c: string) => api.get<StaffMember[]>(`${base(c)}/staff`),
  invite: (c: string, body: InviteStaffPayload) =>
    api.post<StaffMember>(`${base(c)}/staff`, body),
  updateStaff: (c: string, id: string, body: StaffUpdatePayload) =>
    api.put<StaffMember>(`${base(c)}/staff/${id}`, body),
  removeStaff: (c: string, id: string) => api.delete<null>(`${base(c)}/staff/${id}`),

  // ---- doctors / services / schedules ----
  doctors: (c: string) => api.get<ClinicAffiliation[]>(`${base(c)}/doctors`),
  affiliate: (c: string, body: AffiliateDoctorPayload) =>
    api.post<{ id: string; status: string }>(`${base(c)}/doctors`, body),
  endAffiliation: (c: string, id: string) => api.delete<null>(`${base(c)}/doctors/${id}`),
  /** `activeOnly` → ?active=1 (bookable services only). */
  services: (c: string, activeOnly = false) =>
    api.get<Service[]>(`${base(c)}/services`, activeOnly ? { active: 1 } : undefined),
  schedules: (c: string, doctorId?: string) =>
    api.get<ClinicScheduleWindow[]>(`${base(c)}/schedules`, { doctor_id: doctorId }),

  // ---- appointments ----
  appointments: (c: string, filters: ClinicAppointmentFilters) =>
    api.page<Appointment>(`${base(c)}/appointments`, { ...filters }),
  appointment: (c: string, id: string) => api.get<Appointment>(`${base(c)}/appointments/${id}`),
  book: (c: string, body: BookOnBehalfPayload) =>
    api.post<Appointment>(`${base(c)}/appointments`, body),
  transition: (c: string, id: string, action: AppointmentAction, reason?: string) =>
    api.post<Appointment>(`${base(c)}/appointments/${id}/${action}`, reason ? { reason } : {}),

  // ---- reports ----
  reports: (c: string, range: InstantRange) =>
    api.get<ClinicReport>(`${base(c)}/reports`, { ...range }),
};
