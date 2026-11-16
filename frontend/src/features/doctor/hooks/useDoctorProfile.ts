'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '../api';
import { useFormat, useT } from '@/i18n/provider';
import { doctorKeys } from './keys';

export function useDoctorProfile() {
  return useQuery({ queryKey: doctorKeys.profile, queryFn: doctorApi.profile });
}

export function useDoctorBranches() {
  return useQuery({ queryKey: doctorKeys.branches, queryFn: doctorApi.branches });
}

/** "Clinic – Branch" label for a branch id ("All locations" for null). */
export function useBranchLabel() {
  const t = useT();
  const f = useFormat();
  const branches = useDoctorBranches();
  return (id: string | null) => {
    if (!id) return t('doctorDash.allLocations');
    const b = branches.data?.find((x) => x.id === id);
    return b ? [f.l(b.clinic), f.l(b)].filter(Boolean).join(' – ') : id;
  };
}
