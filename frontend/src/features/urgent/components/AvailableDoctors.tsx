'use client';

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Building2, MapPin, Stethoscope, UserRoundSearch } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { Button, buttonVariants } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/form';
import { URGENT_KEYS } from '../hooks/keys';
import { urgentApi } from '../api';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { AvailableDoctorsFilters, UrgentConsultationType, UrgentDoctorRef } from '../types';
import { AvailableDoctorCard } from './AvailableDoctorCard';
import { useGovernorates, useSpecialties } from '@/features/directory';

const POLL_MS = 15_000;

/** Doctors available right now (polled), with filters, a live count and honest empty states. */
export function AvailableDoctors({
  onRequest,
}: {
  /** `null` = broadcast to everyone available. */
  onRequest: (doctor: UrgentDoctorRef | null) => void;
}) {
  const t = useT();
  const f = useFormat();
  const [filters, setFilters] = useState<AvailableDoctorsFilters>({});
  const filtered = Object.values(filters).some(Boolean);
  const query = useQuery({
    queryKey: URGENT_KEYS.available(filters),
    queryFn: () => urgentApi.availableDoctors(filters),
    refetchInterval: POLL_MS,
    placeholderData: keepPreviousData,
  });
  const count = query.data?.count ?? 0;

  return (
    <section aria-labelledby="available-title" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 id="available-title" className="text-xl font-semibold sm:text-2xl">
            {t('urgent.available.title')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('urgent.available.liveHint')}</p>
        </div>
        {query.data && (
          <p
            data-testid="available-count"
            aria-live="polite"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800"
          >
            <span className="relative flex size-2.5" aria-hidden>
              {count > 0 && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              )}
              <span
                className={cn(
                  'relative inline-flex size-2.5 rounded-full',
                  count > 0 ? 'bg-emerald-500' : 'bg-slate-400',
                )}
              />
            </span>
            {t('urgent.available.count', { count: f.number(count) })}
          </p>
        )}
      </div>

      <Filters value={filters} onChange={setFilters} />

      {query.isPending ? (
        <div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          role="status"
          aria-label={t('common.loading')}
        >
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.doctors.length === 0 ? (
        <EmptyState
          icon={UserRoundSearch}
          title={t(
            filtered ? 'urgent.available.emptyFilteredTitle' : 'urgent.available.emptyTitle',
          )}
          description={t(
            filtered ? 'urgent.available.emptyFilteredBody' : 'urgent.available.emptyBody',
          )}
          className="rounded-2xl border bg-card"
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => onRequest(null)}>
                {t(filtered ? 'urgent.request.sendToAll' : 'urgent.available.keepOpen')}
              </Button>
              {filtered ? (
                <Button size="lg" variant="outline" onClick={() => setFilters({})}>
                  {t('urgent.available.clearFilters')}
                </Button>
              ) : (
                <Link href="/search" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
                  {t('urgent.available.bookRegular')}
                </Link>
              )}
            </div>
          }
        />
      ) : (
        <ul
          className={cn(
            'grid gap-4 sm:grid-cols-2 xl:grid-cols-3',
            query.isPlaceholderData && 'opacity-60',
          )}
        >
          {query.data.doctors.map((d) => (
            <li key={d.id}>
              <AvailableDoctorCard doctor={d} onRequest={onRequest} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Filters({
  value,
  onChange,
}: {
  value: AvailableDoctorsFilters;
  onChange: (next: AvailableDoctorsFilters) => void;
}) {
  const t = useT();
  const f = useFormat();
  const specialties = useSpecialties();
  const governorates = useGovernorates();
  const set = (patch: AvailableDoctorsFilters) => onChange({ ...value, ...patch });

  return (
    <div
      role="group"
      aria-label={t('urgent.available.filtersLabel')}
      className="grid gap-3 sm:grid-cols-3"
    >
      <NativeSelect
        aria-label={t('urgent.available.specialty')}
        icon={<Stethoscope />}
        value={value.specialty ?? ''}
        disabled={specialties.isPending}
        onChange={(e) => set({ specialty: e.target.value || undefined })}
      >
        <option value="">{t('urgent.available.anySpecialty')}</option>
        {specialties.data?.map((s) => (
          <option key={s.id} value={s.id}>
            {f.l(s)}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label={t('urgent.available.governorate')}
        icon={<MapPin />}
        value={value.governorate ?? ''}
        disabled={governorates.isPending}
        onChange={(e) => set({ governorate: e.target.value || undefined })}
      >
        <option value="">{t('urgent.available.anyGovernorate')}</option>
        {governorates.data?.map((g) => (
          <option key={g.id} value={g.id}>
            {f.l(g)}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label={t('urgent.available.mode')}
        icon={<Building2 />}
        value={value.mode ?? ''}
        onChange={(e) =>
          set({ mode: (e.target.value || undefined) as UrgentConsultationType | undefined })
        }
      >
        <option value="">{t('urgent.available.anyMode')}</option>
        <option value="online">{t('urgent.mode.online')}</option>
        <option value="in_person">{t('urgent.mode.in_person')}</option>
      </NativeSelect>
    </div>
  );
}
