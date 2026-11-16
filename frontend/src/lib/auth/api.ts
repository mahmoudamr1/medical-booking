/** Session endpoints used by the auth provider and the account menus (Sanctum cookie session). */
import { api } from '@/lib/api/client';
import type { CurrentUser } from '@/types/api';

export interface RegisterPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirmation: string;
  account_type: 'patient' | 'doctor';
  locale?: 'ar' | 'en';
  accept_terms: true;
}

export const sessionApi = {
  me: () => api.get<CurrentUser>('/auth/me'),
  login: (body: { email: string; password: string; remember?: boolean }) =>
    api.post<CurrentUser>('/auth/login', body),
  register: (body: RegisterPayload) => api.post<CurrentUser>('/auth/register', body),
  logout: () => api.post<null>('/auth/logout'),
  updateMe: (body: Partial<{ name: string; phone: string | null; locale: 'ar' | 'en' }>) =>
    api.patch<CurrentUser>('/auth/me', body),
};
