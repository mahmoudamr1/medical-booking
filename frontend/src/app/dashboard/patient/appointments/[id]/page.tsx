'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarSearch, Info } from 'lucide-react';
import { AppointmentDetails, appointmentsApi, appointmentKeys } from '@/features/appointments';
import { PatientAppointmentActions } from '@/features/patient';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { DoctorAvatar, doctorAvatarPath } from '@/components/shared/MediaFallback';
import { buttonVariants } from '@/components/ui/button';
import { isApiError } from '@/lib/api/client';
import { BUSINESS_TZ } from '@/lib/dates';
import { useFormat, useT } from '@/i18n/provider';

export default function PatientAppointmentPage() {
  const t = useT();
  const f = useFormat();
  const { id } = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => appointmentsApi.show(id),
  });
  const a = query.data;
  const tz = a?.timezone ?? BUSINESS_TZ;
  const hours = a?.doctor?.min_cancellation_hours;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t('patient.navAppointments'), href: '/dashboard/patient' },
          { label: a?.reference ?? t('common.details') },
        ]}
        title={
          a
            ? f.date(a.starts_at, tz, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : t('common.details')
        }
        description={
          a
            ? `${f.time(a.starts_at, tz)} – ${f.time(a.ends_at, tz)} · ${t('patientPanel.detail.cairoTime')}`
            : undefined
        }
        actions={
          a && (
            <span className="flex items-center gap-3">
              <DoctorAvatar
                name={a.doctor?.name}
                url={doctorAvatarPath(a.doctor?.id)}
                className="size-12 text-sm"
              />
              <span className="min-w-0 text-sm">
                <span className="block truncate font-semibold">{a.doctor?.name}</span>
                <span className="block truncate text-muted-foreground">
                  {f.l(a.doctor, 'title')}
                </span>
              </span>
            </span>
          )
        }
      />

      {query.isPending ? (
        <div className="space-y-4" role="status" aria-label={t('common.loading')}>
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : query.isError ? (
        isApiError(query.error) && (query.error.status === 404 || query.error.status === 403) ? (
          <EmptyState
            icon={CalendarSearch}
            title={t('appointments.notFound')}
            action={
              <Link href="/dashboard/patient" className={buttonVariants({ variant: 'outline' })}>
                {t('appointments.backToList')}
              </Link>
            }
          />
        ) : (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        )
      ) : (
        <>
          {a!.can?.cancel && typeof hours === 'number' && hours > 0 && (
            <p className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t('appointments.policy', { hours: f.number(hours) })}
            </p>
          )}
          <AppointmentDetails
            appointment={a!}
            perspective="patient"
            actions={<PatientAppointmentActions appointment={a!} size="default" />}
          />
        </>
      )}

      <Link
        href="/dashboard/patient"
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('appointments.backToList')}
      </Link>
    </div>
  );
}
