/** Patient profile and consents. */
import { api } from '@/lib/api/client';
import type { Consent, ConsentType, PatientProfile, PatientProfilePayload } from './types';

export const patientApi = {
  profile: () => api.get<PatientProfile>('/patient/profile'),
  updateProfile: (body: PatientProfilePayload) => api.put<PatientProfile>('/patient/profile', body),
  consents: () => api.get<Consent[]>('/consents'),
  updateConsent: (type: ConsentType, granted: boolean) =>
    api.put<Consent[]>(`/consents/${type}`, { granted }),
};
