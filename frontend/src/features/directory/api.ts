/** Public directory endpoints: home, specialties, locations and doctor search/profile. */
import { api } from '@/lib/api/client';
import type { DoctorCard, DoctorPublic, Location, Specialty } from '@/types/api';
import type { DoctorSearchParams, HomeData } from './types';

export const publicApi = {
  home: () => api.get<HomeData>('/home'),
  specialties: () => api.get<Specialty[]>('/specialties'),
  governorates: () => api.get<Location[]>('/locations/governorates'),
  cities: (governorateId: string) =>
    api.get<Location[]>(`/locations/governorates/${governorateId}/cities`),
  areas: (cityId: string) => api.get<Location[]>(`/locations/cities/${cityId}/areas`),
  doctors: (params: DoctorSearchParams, signal?: AbortSignal) =>
    api.page<DoctorCard>('/doctors', params, signal),
  doctor: (id: string) => api.get<DoctorPublic>(`/doctors/${id}`),
};
