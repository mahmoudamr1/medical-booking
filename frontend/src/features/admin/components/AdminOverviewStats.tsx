'use client';

import { QuickLink, StatGroup } from './OverviewParts';
import Link from 'next/link';
import {
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Clock,
  EyeOff,
  Flag,
  HeartHandshake,
  Hourglass,
  Siren,
  Stethoscope,
  UserRoundX,
  Users,
} from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { useFormat, useT } from '@/i18n/provider';
import type { AdminStats } from '../types';

/** "Needs your attention" links and the grouped stat cards of the admin overview. */
export function AdminOverviewStats({ stats: s }: { stats: AdminStats | undefined }) {
  const t = useT();
  const f = useFormat();
  // StatCard renders the value inside a <p>, so the loading placeholder must be phrasing content.
  const n = (v: number | undefined) =>
    v === undefined ? (
      <span
        className="inline-block h-7 w-12 animate-pulse rounded-md bg-slate-200/70 align-middle"
        aria-hidden
      />
    ) : (
      f.number(v)
    );

  return (
    <>
      {s &&
        (s.people.pending_verifications > 0 ||
          s.reviews.open_reports > 0 ||
          s.urgent.flagged > 0) && (
          <Card size="sm" className="border-amber-200 bg-amber-50/50">
            <CardContent className="space-y-2">
              <p className="text-sm font-semibold text-amber-900">
                {t('admin.overview.attention')}
              </p>
              <div className="flex flex-wrap gap-2">
                <QuickLink
                  href="/dashboard/admin/doctors?status=pending"
                  count={s.people.pending_verifications}
                  label={t('admin.overview.stats.pending_verifications')}
                />
                <QuickLink
                  href="/dashboard/admin/reviews?tab=reports"
                  count={s.reviews.open_reports}
                  label={t('admin.overview.stats.open_reports')}
                />
                <QuickLink
                  href="/dashboard/admin/urgent?flagged=1"
                  count={s.urgent.flagged}
                  label={t('admin.overview.stats.flagged')}
                />
              </div>
            </CardContent>
          </Card>
        )}

      <StatGroup title={t('admin.overview.people')}>
        <StatCard
          label={t('admin.overview.stats.total_patients')}
          value={n(s?.people.total_patients)}
          icon={<Users />}
        />
        <StatCard
          label={t('admin.overview.stats.total_doctors')}
          value={n(s?.people.total_doctors)}
          icon={<Stethoscope />}
        />
        <StatCard
          label={t('admin.overview.stats.verified_doctors')}
          value={n(s?.people.verified_doctors)}
          icon={<BadgeCheck />}
          tone="success"
        />
        <StatCard
          label={t('admin.overview.stats.pending_verifications')}
          value={n(s?.people.pending_verifications)}
          icon={<Hourglass />}
          tone={s?.people.pending_verifications ? 'warning' : 'muted'}
          hint={
            <Link
              href="/dashboard/admin/doctors?status=pending"
              className="text-primary hover:underline"
            >
              {t('admin.overview.review')}
            </Link>
          }
        />
        <StatCard
          label={t('admin.overview.stats.total_clinics')}
          value={n(s?.people.total_clinics)}
          icon={<Building2 />}
          tone="info"
        />
        <StatCard
          label={t('admin.overview.stats.active_volunteers')}
          value={n(s?.people.active_volunteers)}
          icon={<HeartHandshake />}
          tone="info"
        />
      </StatGroup>

      <StatGroup title={t('admin.overview.appointments')}>
        <StatCard
          label={t('admin.overview.stats.total')}
          value={n(s?.appointments.total)}
          icon={<BarChart3 />}
        />
        <StatCard
          label={t('admin.overview.stats.upcoming')}
          value={n(s?.appointments.upcoming)}
          icon={<CalendarClock />}
          tone="info"
        />
        <StatCard
          label={t('admin.overview.stats.pending')}
          value={n(s?.appointments.pending)}
          icon={<Clock />}
          tone="warning"
        />
        <StatCard
          label={t('admin.overview.stats.completed')}
          value={n(s?.appointments.completed)}
          icon={<CalendarCheck />}
          tone="success"
        />
        <StatCard
          label={t('admin.overview.stats.cancelled')}
          value={n(s?.appointments.cancelled)}
          icon={<CalendarX />}
          tone="muted"
        />
        <StatCard
          label={t('admin.overview.stats.no_show')}
          value={n(s?.appointments.no_show)}
          icon={<UserRoundX />}
          tone="danger"
        />
      </StatGroup>

      <div className="grid gap-6 xl:grid-cols-2">
        <StatGroup title={t('admin.overview.urgent')} cols="">
          <StatCard
            label={t('admin.overview.stats.open')}
            value={n(s?.urgent.open)}
            icon={<Siren />}
            tone="warning"
          />
          <StatCard
            label={t('admin.overview.stats.unmatched')}
            value={n(s?.urgent.unmatched)}
            icon={<UserRoundX />}
            tone="danger"
          />
          <StatCard
            label={t('admin.overview.stats.urgentCompleted')}
            value={n(s?.urgent.completed)}
            icon={<CalendarCheck />}
            tone="success"
          />
          <StatCard
            label={t('admin.overview.stats.flagged')}
            value={n(s?.urgent.flagged)}
            icon={<Flag />}
            tone={s?.urgent.flagged ? 'danger' : 'muted'}
            hint={
              <Link
                href="/dashboard/admin/urgent?flagged=1"
                className="text-primary hover:underline"
              >
                {t('admin.overview.review')}
              </Link>
            }
          />
        </StatGroup>
        <StatGroup title={t('admin.overview.reviews')} cols="">
          <StatCard
            label={t('admin.overview.stats.open_reports')}
            value={n(s?.reviews.open_reports)}
            icon={<Flag />}
            tone={s?.reviews.open_reports ? 'warning' : 'muted'}
            hint={
              <Link
                href="/dashboard/admin/reviews?tab=reports"
                className="text-primary hover:underline"
              >
                {t('admin.overview.review')}
              </Link>
            }
          />
          <StatCard
            label={t('admin.overview.stats.hidden')}
            value={n(s?.reviews.hidden)}
            icon={<EyeOff />}
            tone="muted"
          />
        </StatGroup>
      </div>
    </>
  );
}
