'use client';

import Link from 'next/link';
import { GitBranch, MapPin, Stethoscope } from 'lucide-react';
import { ClinicLogo } from '@/components/shared/MediaFallback';
import type { ClinicSummary, ClinicType } from '../types';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const TYPE_VARIANT: Record<ClinicType, 'info' | 'success' | 'muted'> = {
  hospital: 'info',
  medical_center: 'success',
  clinic: 'muted',
};

/** Facility type badge (hospital / medical center / clinic); falls back to the personal-practice flag. */
export function ClinicTypeBadge({
  clinic,
}: {
  clinic: Pick<ClinicSummary, 'type' | 'is_personal_practice'>;
}) {
  const t = useT();
  const type: ClinicType =
    clinic.type ?? (clinic.is_personal_practice ? 'clinic' : 'medical_center');
  return <Badge variant={TYPE_VARIANT[type]}>{t(`clinic.directory.types.${type}`)}</Badge>;
}

export function ClinicCard({ clinic }: { clinic: ClinicSummary }) {
  const t = useT();
  const f = useFormat();
  const cities = clinic.cities
    .map((c) => f.l(c))
    .filter(Boolean)
    .join('، ');

  return (
    <article
      data-testid="clinic-card"
      className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <ClinicLogo name={f.l(clinic)} url={clinic.logo_url} />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-lg leading-snug font-semibold">
            <Link href={`/clinics/${clinic.slug}`} className="hover:text-primary">
              {f.l(clinic)}
            </Link>
          </h2>
          <ClinicTypeBadge clinic={clinic} />
        </div>
      </div>
      <ul className="mt-4 flex-1 space-y-1.5 text-sm text-muted-foreground">
        {cities && (
          <li className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{cities}</span>
          </li>
        )}
        <li className="flex items-center gap-2">
          <GitBranch className="size-4 shrink-0" aria-hidden />
          {t('clinic.directory.branchesCount', { count: f.number(clinic.branches_count) })}
        </li>
        {clinic.doctors_count !== null && (
          <li className="flex items-center gap-2">
            <Stethoscope className="size-4 shrink-0" aria-hidden />
            {t('clinic.directory.doctorsCount', { count: f.number(clinic.doctors_count) })}
          </li>
        )}
      </ul>
      <Link
        href={`/clinics/${clinic.slug}`}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4 self-start')}
      >
        {t('clinic.directory.view')}
      </Link>
    </article>
  );
}

export function ClinicCardSkeleton() {
  return <div className="h-52 animate-pulse rounded-2xl border bg-muted/40" aria-hidden />;
}
