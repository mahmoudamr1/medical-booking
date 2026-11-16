'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RequireAuth } from '@/features/auth';
import { LoadingState } from '@/components/shared/states';
import { useAuth } from '@/lib/auth/AuthProvider';
import { landingPathFor } from '@/lib/auth/landing';

/** /dashboard sends each account to its own dashboard. */
export default function DashboardIndexPage() {
  return (
    <RequireAuth>
      <Redirect />
    </RequireAuth>
  );
}

function Redirect() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user) router.replace(landingPathFor(user));
  }, [user, router]);
  return <LoadingState className="py-24" />;
}
