'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, HeartHandshake, Siren } from 'lucide-react';
import { Skeleton } from '@/components/shared/states';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { URGENT_KEYS, urgentApi, volunteerApi } from '@/features/urgent';
import { BUSINESS_TZ } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

/** Highlighted "next available slot" (from the dashboard payload). */
export function NextSlotCard({ value, loading }: { value: string | null; loading: boolean }) {
  const t = useT();
  const f = useFormat();
  return (
    <Card size="sm" className="gap-0 bg-primary text-primary-foreground ring-0">
      <CardContent className="flex items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/15">
          <CalendarClock className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm opacity-90">{t('doctorPanel.overview.nextSlotTitle')}</p>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-40 bg-white/30" />
          ) : (
            <p className="text-lg font-semibold" data-testid="next-slot">
              {value ? f.dateTime(value, BUSINESS_TZ) : t('doctorPanel.overview.nextSlotNone')}
            </p>
          )}
          <p className="text-xs opacity-80">{t('doctorPanel.overview.nextSlotHint')}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Volunteer status + count of new urgent requests (same cache as the nav badge). */
export function VolunteerCard() {
  const t = useT();
  const f = useFormat();
  const volunteer = useQuery({ queryKey: URGENT_KEYS.volunteer, queryFn: volunteerApi.show });
  const open = useQuery({
    queryKey: URGENT_KEYS.doctorList('open'),
    queryFn: () => urgentApi.doctorList('open'),
    enabled: !!volunteer.data?.opted_in,
    refetchInterval: 30_000,
  });
  if (volunteer.isPending) return <Skeleton className="h-28 w-full rounded-xl" />;
  if (volunteer.isError) return null;
  const v = volunteer.data;
  const newCount = open.data?.pagination.total ?? 0;
  const message = !v.opted_in
    ? 'doctorPanel.overview.volunteerOptedOut'
    : v.available_now
      ? 'doctorPanel.overview.volunteerOn'
      : 'doctorPanel.overview.volunteerOff';

  return (
    <Card size="sm" className="gap-0" data-testid="volunteer-card">
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg',
              v.available_now ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground',
            )}
          >
            <HeartHandshake className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{t('doctorPanel.overview.volunteerTitle')}</p>
            <p className="text-sm text-muted-foreground">{t(message)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/doctor/volunteer"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            {t('doctorPanel.overview.manage')}
          </Link>
          {v.opted_in && (
            <Link
              href="/dashboard/doctor/urgent"
              className={buttonVariants({
                variant: newCount > 0 ? 'default' : 'ghost',
                size: 'sm',
              })}
            >
              <Siren aria-hidden />
              {t('doctorPanel.overview.openRequests', { count: f.number(newCount) })}
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
