/** Availability lookup and booking (patient self-booking). */
import { api } from '@/lib/api/client';
import type { Appointment } from '@/types/api';
import type { Availability } from './types';

export const bookingApi = {
  availability: (
    doctorId: string,
    params: { service_id: string; date_from: string; date_to: string },
  ) => api.get<Availability>(`/doctors/${doctorId}/availability`, params),
  book: (body: { doctor_id: string; service_id: string; starts_at: string; notes?: string }) =>
    api.post<Appointment>('/appointments', body),
};
