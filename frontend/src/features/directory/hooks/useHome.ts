'use client';

import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../api';
import { directoryKeys } from './keys';

export function useHome() {
  return useQuery({ queryKey: directoryKeys.home, queryFn: publicApi.home });
}
