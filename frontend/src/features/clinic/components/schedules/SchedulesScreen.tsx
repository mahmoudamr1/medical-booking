'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import { CLINIC_PERMISSIONS as P, type ClinicScheduleWindow } from '../../types';
import { RequireClinicPermission, useClinic } from '../ClinicContext';
import {
  WEEK_ORDER,
  uniqueDoctors,
  useClinicAffiliations,
  useClinicBranches,
} from '../../hooks/useClinicData';
import { clinicApi } from '../../api';
import { clinicKeys } from '../../hooks/keys';
import { ErrorState, LoadingState, Section } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pager, useClientPage } from '@/components/shared/ClientPager';
import { Field, NativeSelect } from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

export function SchedulesScreen() {
  return (
    <RequireClinicPermission permission={P.viewSchedules}>
      <SchedulesView />
    </RequireClinicPermission>
  );
}

/** Read-only weekly grid: one row per doctor, one column per day (Saturday first). */
function SchedulesView() {
  const t = useT();
  const f = useFormat();
  const { clinicId } = useClinic();
  const [doctorId, setDoctorId] = useState('');
  const affiliations = useClinicAffiliations(clinicId);
  const branches = useClinicBranches(clinicId);
  const query = useQuery({
    queryKey: clinicKeys.of(clinicId, 'schedules', doctorId),
    queryFn: () => clinicApi.schedules(clinicId, doctorId || undefined),
  });

  const branchName = new Map((branches.data ?? []).map((b) => [b.id, f.l(b)]));
  const byDoctor = new Map<string, { name: string; windows: ClinicScheduleWindow[] }>();
  for (const w of query.data ?? []) {
    const entry = byDoctor.get(w.doctor.id) ?? { name: w.doctor.name, windows: [] };
    entry.windows.push(w);
    byDoctor.set(w.doctor.id, entry);
  }
  const { pageItems, meta, setPage } = useClientPage([...byDoctor.entries()], 10);

  return (
    <>
      <PageHeader
        title={t('clinic.schedules.title')}
        description={t('clinic.schedules.subtitle')}
      />
      <Field label={t('clinic.schedules.doctor')} htmlFor="s-doctor" className="max-w-xs">
        <NativeSelect id="s-doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          <option value="">{t('clinic.schedules.allDoctors')}</option>
          {uniqueDoctors(affiliations.data, false).map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      {query.isPending ? (
        <LoadingState rows={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : byDoctor.size === 0 ? (
        <EmptyState icon={CalendarClock} title={t('clinic.schedules.empty')} />
      ) : (
        <Section>
          <div className="-mx-(--card-spacing)">
            <Table className="min-w-[56rem]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40 ps-(--card-spacing) text-start">
                    {t('clinic.schedules.doctor')}
                  </TableHead>
                  {WEEK_ORDER.map((d) => (
                    <TableHead key={d} className="text-start">
                      {f.weekday(d, 'short')}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map(([id, { name, windows }]) => (
                  <TableRow key={id}>
                    <TableCell className="ps-(--card-spacing) align-top font-medium">
                      {name}
                    </TableCell>
                    {WEEK_ORDER.map((day) => {
                      const ws = windows.filter((w) => w.day_of_week === day);
                      return (
                        <TableCell key={day} className="align-top">
                          {ws.length === 0 ? (
                            <span className="text-muted-foreground">
                              {t('clinic.schedules.dayOff')}
                            </span>
                          ) : (
                            <ul className="space-y-1.5">
                              {ws.map((w) => (
                                <li
                                  key={w.id}
                                  className={cn(
                                    'rounded-md border px-2 py-1 text-xs',
                                    w.is_active
                                      ? 'border-teal-200 bg-teal-50/60'
                                      : 'border-dashed opacity-60',
                                  )}
                                >
                                  <span className="block font-medium tabular-nums" dir="ltr">
                                    {w.starts_at}–{w.ends_at}
                                  </span>
                                  {w.clinic_branch_id && (
                                    <span className="block text-muted-foreground">
                                      {branchName.get(w.clinic_branch_id)}
                                    </span>
                                  )}
                                  {w.breaks.map((b) => (
                                    <span key={b.starts_at} className="block text-muted-foreground">
                                      {t('clinic.schedules.breaks', {
                                        from: b.starts_at,
                                        to: b.ends_at,
                                      })}
                                    </span>
                                  ))}
                                  {!w.is_active && (
                                    <span className="block text-muted-foreground">
                                      {t('clinic.schedules.inactive')}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pager meta={meta} onPageChange={setPage} />
          </div>
        </Section>
      )}
    </>
  );
}
