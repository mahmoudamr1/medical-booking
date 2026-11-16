/** Doctor self-service endpoints (/doctor/*). */
import { api } from '@/lib/api/client';
import type { Appointment, Branch, Service } from '@/types/api';
import type {
  DoctorAppointmentsQuery,
  DoctorDashboard,
  DoctorDocument,
  DoctorPreferences,
  DoctorProfilePayload,
  DoctorSelf,
  DocumentType,
  ExceptionPayload,
  ExceptionRange,
  PracticePayload,
  ScheduleException,
  ScheduleWindow,
  ScheduleWindowPayload,
  ServicePayload,
} from './types';

/** The API caps an appointment page at 500 rows; a calendar range for one doctor stays below it. */
export const APPOINTMENTS_PAGE_MAX = 500;

export const doctorApi = {
  dashboard: () => api.get<DoctorDashboard>('/doctor/dashboard'),
  /** Appointments starting in [from, to). One full page by default; pass page/per_page for paged lists. */
  appointments: (query: DoctorAppointmentsQuery) =>
    api.page<Appointment>('/doctor/appointments', { per_page: APPOINTMENTS_PAGE_MAX, ...query }),
  branches: () => api.get<Branch[]>('/doctor/branches'),
  createPractice: (body: PracticePayload) => api.post<Branch>('/doctor/practice', body),

  profile: () => api.get<DoctorSelf>('/doctor/profile'),
  updateProfile: (body: DoctorProfilePayload) => api.put<DoctorSelf>('/doctor/profile', body),
  updateSpecialties: (specialtyIds: string[], primaryId: string) =>
    api.put<DoctorSelf>('/doctor/specialties', {
      specialty_ids: specialtyIds,
      primary_id: primaryId,
    }),
  submitVerification: () => api.post<DoctorSelf>('/doctor/verification/submit'),

  documents: () => api.get<DoctorDocument[]>('/doctor/documents'),
  uploadDocument: (type: DocumentType, file: File) => {
    const form = new FormData();
    form.append('type', type);
    form.append('file', file);
    return api.post<DoctorDocument>('/doctor/documents', form);
  },
  deleteDocument: (id: string) => api.delete<null>(`/doctor/documents/${id}`),
  documentUrl: (id: string) => `/api/v1/doctor/documents/${id}/download`,

  schedules: () => api.get<ScheduleWindow[]>('/doctor/schedules'),
  saveSchedules: (schedules: ScheduleWindowPayload[]) =>
    api.put<ScheduleWindow[]>('/doctor/schedules', { schedules }),
  /** Today onwards by default; a range also returns past exceptions (calendar shading). */
  exceptions: (range?: ExceptionRange) =>
    api.get<ScheduleException[]>('/doctor/exceptions', { ...range }),
  createException: (body: ExceptionPayload) =>
    api.post<ScheduleException[]>('/doctor/exceptions', body),
  deleteException: (id: string) => api.delete<null>(`/doctor/exceptions/${id}`),
  preferences: () => api.get<DoctorPreferences>('/doctor/preferences'),
  updatePreferences: (body: Partial<DoctorPreferences>) =>
    api.put<DoctorPreferences>('/doctor/preferences', body),

  services: () => api.get<Service[]>('/doctor/services'),
  createService: (body: ServicePayload) => api.post<Service>('/doctor/services', body),
  updateService: (id: string, body: Partial<ServicePayload>) =>
    api.put<Service>(`/doctor/services/${id}`, body),
  deleteService: (id: string) => api.delete<null>(`/doctor/services/${id}`),
};
