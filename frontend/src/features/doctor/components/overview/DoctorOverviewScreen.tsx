'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Hourglass,
  Star,
  XCircle,
} from 'lucide-react';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DoctorAppointmentSheet } from '../DoctorAppointmentActions';
import { useDoctorProfile } from '../../hooks/useDoctorProfile';
import { TodayTimeline } from './TodayTimeline';
import { PendingPanel } from './PendingPanel';
import { NextSlotCard, VolunteerCard } from './SideCards';
import { doctorApi } from '../../api';
import { doctorKeys } from '../../hooks/keys';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { BUSINESS_TZ } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';

const STATS_COLS = 'grid-cols-2 md:grid-cols-3';

export function DoctorOverviewScreen() {
  const t = useT();
  const f = useFormat();
  const [openId, setOpenId] = useState<string | null>(null);
  const profile = useDoctorProfile();
  const dashboard = useQuery({
    queryKey: doctorKeys.dashboard,
    queryFn: doctorApi.dashboard,
    refetchInterval: 60_000,
  });
  const d = dashboard.data;
  const approved = (d?.verification_status ?? profile.data?.verification_status) === 'approved';

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {profile.data
              ? t('doctorPanel.overview.greeting', { name: profile.data.name })
              : t('doctorDash.nav.overview')}
            {approved && (
              <Badge variant="success">
                <BadgeCheck aria-hidden />
                {t('doctorPanel.overview.verified')}
              </Badge>
            )}
          </span>
        }
        description={t('doctorPanel.overview.todayIs', { date: f.date(new Date(), BUSINESS_TZ) })}
        actions={
          <>
            <Link
              href="/dashboard/doctor/schedule"
              className={buttonVariants({ variant: 'outline' })}
            >
              <Clock aria-hidden />
              {t('doctorPanel.overview.editSchedule')}
            </Link>
            <Link href="/dashboard/doctor/calendar" className={buttonVariants()}>
              <CalendarDays aria-hidden />
              {t('doctorPanel.overview.openCalendar')}
            </Link>
          </>
        }
      />

      {dashboard.isPending ? (
        <div className={`grid gap-3 ${STATS_COLS}`} role="status" aria-label={t('common.loading')}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : dashboard.isError ? (
        <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
      ) : (
        <div data-testid="doctor-stats">
          <StatGrid cols={STATS_COLS}>
            <StatCard
              tone="primary"
              icon={CalendarClock}
              label={t('doctorDash.counts.today')}
              value={f.number(d!.counts.today)}
              href="/dashboard/doctor/calendar?view=day"
            />
            <StatCard
              tone="success"
              icon={CalendarCheck}
              label={t('doctorDash.counts.upcoming')}
              value={f.number(d!.counts.upcoming)}
              href="/dashboard/doctor/calendar?view=week"
            />
            <StatCard
              tone="warning"
              icon={Hourglass}
              label={t('doctorDash.counts.pending')}
              value={f.number(d!.counts.pending)}
            />
            <StatCard
              tone="info"
              icon={CheckCircle2}
              label={t('doctorDash.counts.completed')}
              value={f.number(d!.counts.completed)}
              hint={t('doctorPanel.overview.noShowHint', { count: f.number(d!.counts.no_show) })}
            />
            <StatCard
              tone="muted"
              icon={XCircle}
              label={t('doctorDash.counts.cancelled')}
              value={f.number(d!.counts.cancelled)}
            />
            <StatCard
              tone="warning"
              icon={Star}
              label={t('doctorDash.rating')}
              value={d!.rating_count > 0 ? f.number(d!.rating_avg) : '—'}
              hint={
                d!.rating_count > 0
                  ? t('doctorPanel.overview.ratingHint', { count: f.number(d!.rating_count) })
                  : t('doctorPanel.overview.noRatings')
              }
            />
          </StatGrid>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <TodayTimeline
          loading={dashboard.isPending}
          appointments={d?.today ?? []}
          onOpen={setOpenId}
        />
        <div className="space-y-6">
          <NextSlotCard loading={dashboard.isPending} value={d?.next_available_at ?? null} />
          <PendingPanel total={d?.counts.pending} onOpen={setOpenId} />
          <VolunteerCard />
        </div>
      </div>

      <DoctorAppointmentSheet appointmentId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
