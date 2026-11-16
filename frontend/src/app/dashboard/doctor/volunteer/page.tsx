'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { HeartHandshake, ShieldAlert } from 'lucide-react';
import type { VolunteerProfile } from '@/features/urgent';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { PageHeader } from '@/components/shared/PageHeader';
import { AvailabilityCard, SettingsForm, URGENT_KEYS, volunteerApi } from '@/features/urgent';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

export default function VolunteerPage() {
  const t = useT();
  const query = useQuery({ queryKey: URGENT_KEYS.volunteer, queryFn: volunteerApi.show });
  const v = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('doctorUrgent.volunteer.title')}
        description={t('doctorUrgent.volunteer.description')}
        actions={v && <StatusPills profile={v} />}
      />
      {query.isPending ? (
        <div className="space-y-4" role="status" aria-label={t('common.loading')}>
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          {v!.eligible ? <AvailabilityCard profile={v!} /> : <IneligibleNotice />}
          <SettingsForm profile={v!} disabled={!v!.eligible} />
        </>
      )}
    </div>
  );
}

function StatusPills({ profile: p }: { profile: VolunteerProfile }) {
  const t = useT();
  const upcoming = p.windows.length > 0 && !p.available_now;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Badge
        variant={p.opted_in ? 'info' : 'muted'}
        className="h-7 px-3 text-sm"
        data-testid="volunteer-optin"
        data-opted-in={String(p.opted_in)}
      >
        <HeartHandshake aria-hidden />
        {p.opted_in
          ? t('doctorUrgent.volunteer.optedIn')
          : t('doctorUrgent.volunteer.statusOptedOut')}
      </Badge>
      {p.opted_in && (
        <Badge
          variant={p.available_now ? 'success' : upcoming ? 'warning' : 'muted'}
          className="h-7 px-3 text-sm"
          data-testid="volunteer-availability"
          data-available={String(p.available_now)}
        >
          <span
            className={cn(
              'size-2 rounded-full',
              p.available_now ? 'bg-emerald-500' : upcoming ? 'bg-amber-500' : 'bg-slate-400',
            )}
            aria-hidden
          />
          {p.available_now
            ? t('doctorUrgent.volunteer.availableNow')
            : upcoming
              ? t('doctorUrgent.volunteer.statusScheduled')
              : t('doctorUrgent.volunteer.notAvailable')}
        </Badge>
      )}
    </span>
  );
}

/** Unverified doctors see why they can't volunteer yet; the settings below render read-only. */
function IneligibleNotice() {
  const t = useT();
  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950 sm:flex-row sm:items-center sm:justify-between"
      role="status"
      data-testid="volunteer-ineligible"
    >
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="space-y-1">
          <p className="font-semibold">{t('doctorUrgent.volunteer.ineligibleTitle')}</p>
          <p className="text-sm">{t('doctorUrgent.volunteer.notEligible')}</p>
          <p className="text-sm opacity-90">{t('doctorUrgent.volunteer.ineligibleBody')}</p>
        </div>
      </div>
      <Link
        href="/dashboard/doctor/verification"
        className={buttonVariants({ className: 'shrink-0' })}
      >
        {t('doctorUrgent.volunteer.goVerify')}
      </Link>
    </div>
  );
}
