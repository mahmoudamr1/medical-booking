/** Appointment reads and lifecycle transitions shared by patients and doctors. */
import { api } from '@/lib/api/client';
import type { Appointment, AppointmentAction, AppointmentGroup } from '@/types/api';
import type { AppointmentSummary } from './types';

export const appointmentsApi = {
  patientList: (group: AppointmentGroup, page: number) =>
    api.page<Appointment>('/patient/appointments', { group, page, per_page: 10 }),
  patientSummary: () => api.get<AppointmentSummary>('/patient/appointments/summary'),
  show: (id: string) => api.get<Appointment>(`/appointments/${id}`),
  transition: (id: string, action: AppointmentAction, reason?: string) =>
    api.post<Appointment>(`/appointments/${id}/${action}`, reason ? { reason } : {}),
  reschedule: (id: string, startsAt: string) =>
    api.post<Appointment>(`/appointments/${id}/reschedule`, { starts_at: startsAt }),
};
