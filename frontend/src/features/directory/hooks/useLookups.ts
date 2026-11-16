'use client';

/** Cached public lookups (specialties, governorates → cities → areas) shared by every form. */
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../api';
import { directoryKeys } from './keys';

const SPECIALTIES_STALE_MS = 10 * 60 * 1000;
const LOCATIONS_STALE_MS = 60 * 60 * 1000;

export function useSpecialties() {
  return useQuery({
    queryKey: directoryKeys.specialties,
    queryFn: publicApi.specialties,
    staleTime: SPECIALTIES_STALE_MS,
  });
}

export function useGovernorates() {
  return useQuery({
    queryKey: directoryKeys.governorates,
    queryFn: publicApi.governorates,
    staleTime: LOCATIONS_STALE_MS,
  });
}

export function useCities(governorateId: string) {
  return useQuery({
    queryKey: directoryKeys.cities(governorateId),
    queryFn: () => publicApi.cities(governorateId),
    enabled: !!governorateId,
    staleTime: LOCATIONS_STALE_MS,
  });
}

export function useAreas(cityId: string, enabled = true) {
  return useQuery({
    queryKey: directoryKeys.areas(cityId),
    queryFn: () => publicApi.areas(cityId),
    enabled: enabled && !!cityId,
    staleTime: LOCATIONS_STALE_MS,
  });
}
