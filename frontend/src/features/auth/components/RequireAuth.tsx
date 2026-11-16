'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useAuth, hasRole, type DashboardRole } from '@/lib/auth/AuthProvider';
import { LoadingState } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { buttonVariants } from '@/components/ui/button';
import { useT } from '@/i18n/provider';

/**
 * Client-side route guard (UX only — every API call is authorized by the backend).
 * Guests are sent to login with a return URL; users without the role see a forbidden state.
 */
export function RequireAuth({ role, children }: { role?: DashboardRole; children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useT();

  useEffect(() => {
    if (!isLoading && !user) {
      const qs = searchParams.toString();
      router.replace(`/auth/login?next=${encodeURIComponent(qs ? `${pathname}?${qs}` : pathname)}`);
    }
  }, [isLoading, user, router, pathname, searchParams]);

  if (isLoading || !user) return <LoadingState className="py-24" />;

  if (role && !hasRole(user, role)) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6 text-red-500" />}
          title={t('guard.forbiddenTitle')}
          description={t('guard.forbiddenBody')}
          action={
            <Link href="/" className={buttonVariants({ variant: 'outline' })}>
              {t('common.backHome')}
            </Link>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
