'use client';

import { useEffect } from 'react';
import { AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormat, useT } from '@/i18n/provider';
import type { UrgentRequest, UrgentSeverity } from '../../types';

const RANK: Record<UrgentSeverity, number> = { critical: 0, urgent: 1, standard: 2 };

/** Open requests: critical first, then urgent, then standard; oldest first within a severity. */
export function sortBySeverity<T extends UrgentRequest>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      RANK[a.severity] - RANK[b.severity] || (a.created_at ?? '').localeCompare(b.created_at ?? ''),
  );
}

/**
 * Prefixes the tab title with the number of new requests ("(! 2) …" when one is critical) so an incoming
 * request is noticeable from another tab. No sound. Restores the title on unmount.
 */
export function useIncomingTitleBadge(count: number, critical: boolean) {
  useEffect(() => {
    const base = document.title.replace(/^\(!? ?\d+\) /, '');
    document.title = count > 0 ? `(${critical ? '! ' : ''}${count}) ${base}` : base;
    return () => {
      document.title = document.title.replace(/^\(!? ?\d+\) /, '');
    };
  }, [count, critical]);
}

/** Prominent alert while critical requests are waiting for this doctor (visual only, no sound). */
export function CriticalRequestsAlert({
  requests,
  onOpen,
}: {
  requests: UrgentRequest[];
  onOpen: (id: string) => void;
}) {
  const t = useT();
  const f = useFormat();
  const critical = sortBySeverity(requests.filter((r) => r.severity === 'critical'));
  if (critical.length === 0) return null;
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border-2 border-red-500 bg-red-50 p-4 text-red-900 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      data-testid="critical-alert"
    >
      <p className="flex items-center gap-3 font-semibold">
        <span className="relative flex size-3 shrink-0" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex size-3 rounded-full bg-red-600" />
        </span>
        {t('doctorUrgent.requests.criticalAlert', { count: f.number(critical.length) })}
      </p>
      <Button variant="danger" onClick={() => onOpen(critical[0].id)} className="shrink-0">
        <AlertOctagon aria-hidden />
        {t('doctorUrgent.requests.reviewNow')}
      </Button>
    </div>
  );
}
