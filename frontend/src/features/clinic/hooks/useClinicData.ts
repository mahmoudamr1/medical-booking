'use client';

import { useQuery } from '@tanstack/react-query';
import type { ClinicAffiliation } from '../types';
import { clinicApi } from '../api';
import { clinicKeys } from './keys';

export function useClinicBranches(clinicId: string) {
  return useQuery({
    queryKey: clinicKeys.of(clinicId, 'branches'),
    queryFn: () => clinicApi.branches(clinicId),
  });
}

export function useClinicAffiliations(clinicId: string, enabled = true) {
  return useQuery({
    queryKey: clinicKeys.of(clinicId, 'doctors'),
    queryFn: () => clinicApi.doctors(clinicId),
    enabled,
  });
}

export function useClinicServices(clinicId: string, enabled = true) {
  return useQuery({
    queryKey: clinicKeys.of(clinicId, 'services', 'active'),
    queryFn: () => clinicApi.services(clinicId, true),
    enabled,
  });
}

type ClinicDoctorOption = ClinicAffiliation['doctor'];

/** One entry per doctor (a doctor may be affiliated with several branches). */
export function uniqueDoctors(
  affiliations: ClinicAffiliation[] | undefined,
  activeOnly = true,
): ClinicDoctorOption[] {
  const seen = new Map<string, ClinicDoctorOption>();
  for (const a of affiliations ?? []) {
    if (activeOnly && a.status !== 'active') continue;
    if (!seen.has(a.doctor.id)) seen.set(a.doctor.id, a.doctor);
  }
  return [...seen.values()];
}

/** Saturday-first week order (common in Egypt); values are API day_of_week (0 = Sunday). */
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5] as const;
