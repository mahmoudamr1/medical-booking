'use client';

import { useQuery } from '@tanstack/react-query';
import { Globe2 } from 'lucide-react';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  useDoctorBranches,
  useDoctorProfile,
  ScheduleEditor,
  doctorApi,
  doctorKeys,
} from '@/features/doctor';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/i18n/provider';
import { BUSINESS_TZ } from '@/i18n/format';

export default function SchedulePage() {
  const t = useT();
  const schedules = useQuery({ queryKey: doctorKeys.schedules, queryFn: doctorApi.schedules });
  const branches = useDoctorBranches();
  const profile = useDoctorProfile();

  const header = (
    <PageHeader
      title={t('doctorDash.scheduleTitle')}
      description={t('doctorDash.scheduleHint')}
      actions={
        <Badge variant="outline" className="h-8 px-3 text-sm">
          <Globe2 aria-hidden />
          {t('doctorDash.timezone', { tz: profile.data?.preferences.timezone ?? BUSINESS_TZ })}
        </Badge>
      }
    />
  );

  if (schedules.isPending || branches.isPending)
    return (
      <div className="space-y-4">
        {header}
        <div className="grid gap-3 xl:grid-cols-2" role="status" aria-label={t('common.loading')}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  if (schedules.isError || branches.isError)
    return (
      <div className="space-y-4">
        {header}
        <ErrorState
          error={schedules.error ?? branches.error}
          onRetry={() => {
            schedules.refetch();
            branches.refetch();
          }}
        />
      </div>
    );

  return (
    <div className="space-y-4">
      {header}
      {branches.data.length === 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('doctorDash.noBranches')}
        </p>
      )}
      <ScheduleEditor initial={schedules.data} branches={branches.data} />
    </div>
  );
}
