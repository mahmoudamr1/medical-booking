'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useI18n } from '@/i18n/provider';
import { sessionApi } from './api';
import { useAuth } from './AuthProvider';

/** Flips ar ⇄ en; also remembers it on the account (used for emails/notifications), best effort. */
export function useSwitchLanguage() {
  const { locale, setLocale } = useI18n();
  const { user } = useAuth();
  const next = locale === 'ar' ? 'en' : 'ar';
  const switchLanguage = () => {
    setLocale(next);
    if (user) sessionApi.updateMe({ locale: next }).catch(() => undefined);
  };
  return { next, switchLanguage };
}

/** Signs out, confirms with a toast and returns to the home page. */
export function useLogout() {
  const { logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  return async () => {
    await logout();
    toast.success(t('auth.loggedOut'));
    router.push('/');
  };
}
