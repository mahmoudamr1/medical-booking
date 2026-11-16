'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CalendarPlus, CalendarX2 } from 'lucide-react';
import type { AppointmentGroup } from '@/types/api';
import { AppointmentCard, appointmentsApi, appointmentKeys } from '@/features/appointments';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pagination } from '@/components/shared/Pagination';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { PatientAppointmentActions } from './PatientAppointmentActions';
import { NextAppointmentCard, RateVisitPrompt } from './PatientHighlights';
import { ProfileShortcut, RecentNotifications, UrgentHelpCard } from './PatientSidebar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const GROUPS: AppointmentGroup[] = ['upcoming', 'pending', 'completed', 'cancelled'];

export function PatientHomeScreen() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PatientDashboard />
    </Suspense>
  );
}

function PatientDashboard() {
  const t = useT();
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          user ? t('patientPanel.dashboard.greeting', { name: user.name }) : t('patient.title')
        }
        description={t('patient.subtitle')}
        actions={
          <Button asChild>
            <Link href="/search">
              <CalendarPlus aria-hidden />
              {t('appointments.bookNow')}
            </Link>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <NextAppointmentCard />
          <RateVisitPrompt />
          <AppointmentTabs />
        </div>
        <aside className="space-y-4">
          <UrgentHelpCard />
          <RecentNotifications />
          <ProfileShortcut />
        </aside>
      </div>
    </div>
  );
}

function AppointmentTabs() {
  const t = useT();
  const f = useFormat();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const group = (GROUPS.find((g) => g === searchParams.get('tab')) ??
    'upcoming') as AppointmentGroup;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const summary = useQuery({
    queryKey: appointmentKeys.patientSummary,
    queryFn: appointmentsApi.patientSummary,
  });
  const list = useQuery({
    queryKey: appointmentKeys.patientList(group, page),
    queryFn: () => appointmentsApi.patientList(group, page),
    placeholderData: keepPreviousData,
  });

  const go = (tab: AppointmentGroup, p = 1) => {
    const qs = new URLSearchParams({ tab });
    if (p > 1) qs.set('page', String(p));
    router.push(`${pathname}?${qs}`, { scroll: false });
  };

  return (
    <section className="space-y-4" aria-label={t('patient.title')}>
      <Tabs value={group} onValueChange={(v) => go(v as AppointmentGroup)}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 group-data-horizontal/tabs:h-auto sm:flex sm:w-fit">
          {GROUPS.map((g) => (
            <TabsTrigger
              key={g}
              value={g}
              className="min-h-11 gap-2 px-3 sm:min-h-9"
              data-testid={`tab-${g}`}
            >
              {t(`groups.${g}`)}
              <span
                className="rounded-full bg-background px-1.5 text-xs text-muted-foreground tabular-nums"
                data-testid={`count-${g}`}
              >
                {summary.data ? f.number(summary.data[g]) : '·'}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div role="tabpanel" aria-label={t(`groups.${group}`)}>
        {list.isPending ? (
          <LoadingState rows={3} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title={t(`appointments.empty.${group}`)}
            action={
              <Button asChild variant="outline">
                <Link href="/search">{t('appointments.bookNow')}</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div
              className={cn('grid gap-4 lg:grid-cols-2', list.isPlaceholderData && 'opacity-60')}
            >
              {list.data.items.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  href={`/dashboard/patient/appointments/${a.id}`}
                  actions={
                    <>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/patient/appointments/${a.id}`}>
                          {t('appointments.view')}
                        </Link>
                      </Button>
                      <PatientAppointmentActions appointment={a} />
                    </>
                  }
                />
              ))}
            </div>
            <Pagination meta={list.data.pagination} onPageChange={(p) => go(group, p)} />
          </>
        )}
      </div>
    </section>
  );
}
