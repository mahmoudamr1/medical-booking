'use client';

import { useQuery } from '@tanstack/react-query';
import { urgentApi } from '../api';
import { URGENT_KEYS } from './keys';

/** Public settings (the urgent on/off switch). */
export function useUrgentSettings() {
  return useQuery({
    queryKey: URGENT_KEYS.settings,
    queryFn: urgentApi.settings,
    staleTime: 300_000,
  });
}
