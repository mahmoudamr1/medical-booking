'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionApi, type RegisterPayload } from './api';
import { isApiError, onUnauthenticated } from '@/lib/api/client';
import type { CurrentUser } from '@/types/api';

export const ME_QUERY_KEY = ['auth', 'me'] as const;

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<CurrentUser>;
  register: (payload: RegisterPayload) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Session state comes only from GET /auth/me (Sanctum cookie). Nothing is stored in localStorage. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      try {
        return await sessionApi.me();
      } catch (e) {
        if (isApiError(e) && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    onUnauthenticated(() => queryClient.setQueryData(ME_QUERY_KEY, null));
    return () => onUnauthenticated(null);
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string, remember?: boolean) => {
      const { data } = await sessionApi.login({ email, password, remember });
      queryClient.setQueryData(ME_QUERY_KEY, data);
      return data;
    },
    [queryClient],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const { data } = await sessionApi.register(payload);
      queryClient.setQueryData(ME_QUERY_KEY, data);
      return data;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await sessionApi.logout();
    } finally {
      // Drop every cached private query, then mark the session as anonymous.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'public' });
      queryClient.setQueryData(ME_QUERY_KEY, null);
    }
  }, [queryClient]);

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
    [queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      isLoading: meQuery.isPending,
      login,
      register,
      logout,
      refresh,
    }),
    [meQuery.data, meQuery.isPending, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export type DashboardRole = 'patient' | 'doctor' | 'admin';

export function hasRole(user: CurrentUser | null, role: DashboardRole): boolean {
  return !!user && user.roles.includes(role);
}

export interface DashboardLink {
  href: string;
  key: 'patientDashboard' | 'doctorDashboard' | 'clinicDashboard' | 'adminDashboard';
}

/** Role-based dashboard entry points (UX only — the API enforces authorization). */
export function dashboardLinks(user: CurrentUser | null): DashboardLink[] {
  if (!user) return [];
  const links: DashboardLink[] = [{ href: '/dashboard/patient', key: 'patientDashboard' }];
  if (hasRole(user, 'doctor')) links.push({ href: '/dashboard/doctor', key: 'doctorDashboard' });
  if (user.clinics.length > 0) links.push({ href: '/dashboard/clinic', key: 'clinicDashboard' });
  if (hasRole(user, 'admin')) links.push({ href: '/dashboard/admin', key: 'adminDashboard' });
  return links;
}

export { landingPathFor as homeFor, safeNext } from './landing';
