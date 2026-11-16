'use client';

import Link from 'next/link';
import { AlertTriangle, BadgeCheck, Clock, FileWarning, Ban } from 'lucide-react';
import type { VerificationStatus } from '@/types/api';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const STYLE: Record<VerificationStatus, { box: string; icon: typeof Clock }> = {
  draft: { box: 'border-blue-200 bg-accent text-accent-foreground', icon: FileWarning },
  pending: { box: 'border-amber-200 bg-amber-50 text-amber-900', icon: Clock },
  approved: { box: 'border-green-200 bg-green-50 text-green-900', icon: BadgeCheck },
  rejected: { box: 'border-red-200 bg-red-50 text-red-900', icon: AlertTriangle },
  suspended: { box: 'border-red-300 bg-red-100 text-red-900', icon: Ban },
};

const MESSAGE = {
  draft: 'verification.bannerDraft',
  pending: 'verification.bannerPending',
  approved: 'verification.bannerApproved',
  rejected: 'verification.bannerRejected',
  suspended: 'verification.bannerSuspended',
} as const;

export function VerificationBanner({
  status,
  notes,
  showLink = true,
}: {
  status: VerificationStatus;
  notes?: string | null;
  showLink?: boolean;
}) {
  const t = useT();
  const { box, icon: Icon } = STYLE[status];
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between',
        box,
      )}
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">{t(`verification.${status}`)}</p>
          <p className="text-sm">{t(MESSAGE[status])}</p>
          {notes && (status === 'rejected' || status === 'suspended') && (
            <p className="mt-2 text-sm">
              <span className="font-semibold">{t('verification.adminNotes')}: </span>
              {notes}
            </p>
          )}
        </div>
      </div>
      {showLink && status !== 'approved' && (
        <Link
          href="/dashboard/doctor/verification"
          className="shrink-0 rounded-lg bg-card/70 px-4 py-2 text-sm font-medium hover:bg-card"
        >
          {t('verification.goToVerification')}
        </Link>
      )}
    </div>
  );
}
