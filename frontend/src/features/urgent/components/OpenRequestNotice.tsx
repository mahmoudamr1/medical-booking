'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { buttonVariants } from '@/components/ui/button';
import { URGENT_KEYS } from '../hooks/keys';
import { urgentApi } from '../api';
import { useT } from '@/i18n/provider';
import { isTerminal } from '../status';

/** The signed-in patient's open urgent request (only one is allowed), if any. */
export function useOpenUrgentRequest(enabled = true) {
  const query = useQuery({
    queryKey: URGENT_KEYS.patientList(1),
    queryFn: () => urgentApi.patientList(1),
    enabled,
  });
  return { ...query, open: query.data?.items.find((r) => !isTerminal(r.status)) ?? null };
}

/** "You already have an open request" with a link straight to it. */
export function OpenRequestNotice({ message }: { message: string }) {
  const t = useT();
  const { open } = useOpenUrgentRequest();
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <span>{message}</span>
      <Link
        href={open ? `/urgent/${open.id}` : '/urgent/history'}
        className={buttonVariants({ size: 'sm' })}
      >
        {t('urgent.request.openExistsLink')}
      </Link>
    </div>
  );
}
