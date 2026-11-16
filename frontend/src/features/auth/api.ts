/** Password recovery and change (session endpoints live in lib/auth/api.ts). */
import { api } from '@/lib/api/client';

export const authApi = {
  forgot: (email: string) => api.post<null>('/auth/forgot-password', { email }),
  reset: (body: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => api.post<null>('/auth/reset-password', body),
  updatePassword: (body: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) => api.put<null>('/auth/password', body),
};
