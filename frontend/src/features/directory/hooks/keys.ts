import type { DoctorSearchParams } from '../types';

/** Query keys of the public directory. Everything under ['public', …] survives logout. */
export const directoryKeys = {
  all: ['public'] as const,
  home: ['public', 'home'] as const,
  specialties: ['public', 'specialties'] as const,
  governorates: ['public', 'governorates'] as const,
  cities: (governorateId: string) => ['public', 'cities', governorateId] as const,
  areas: (cityId: string) => ['public', 'areas', cityId] as const,
  doctors: (params: DoctorSearchParams) => ['public', 'doctors', params] as const,
  doctor: (id: string) => ['public', 'doctor', id] as const,
};
