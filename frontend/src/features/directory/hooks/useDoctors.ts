'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { publicApi } from '../api';
import type { DoctorSearchParams } from '../types';
import { directoryKeys } from './keys';

/** One page of the doctor directory; the previous page stays visible while the next one loads. */
export function useDoctorSearch(params: DoctorSearchParams) {
  return useQuery({
    queryKey: directoryKeys.doctors(params),
    queryFn: ({ signal }) => publicApi.doctors(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useDoctor(id: string) {
  return useQuery({
    queryKey: directoryKeys.doctor(id),
    queryFn: () => publicApi.doctor(id),
  });
}
