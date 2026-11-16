'use client';

import type { ReactNode } from 'react';
import { Carousel } from '@/components/shared/Carousel';
import { DoctorCard, DoctorCardSkeleton } from '@/components/shared/DoctorCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { useT } from '@/i18n/provider';
import type { DoctorCard as DoctorCardData } from '@/types/api';
import { SEARCH_PATH } from '../../searchParams';
import { Band } from '../Band';
import { SectionHeading } from './SectionHeading';

const MAX_DOCTORS = 12;
const PLACEHOLDERS = 4;

/** Titled carousel of doctor cards with its loading and empty states. */
export function DoctorsRow({
  title,
  subtitle,
  doctors,
  loading,
  className,
}: {
  title: string;
  subtitle: string;
  doctors: DoctorCardData[];
  loading: boolean;
  /** Band surface (see `Band`). */
  className?: string;
}) {
  const t = useT();
  const heading = (actions?: ReactNode) => (
    <SectionHeading
      title={title}
      subtitle={subtitle}
      link={{ href: SEARCH_PATH, label: t('home.allDoctorsButton') }}
      actions={actions}
    />
  );

  if (loading) {
    return (
      <Band className={className}>
        {heading()}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: PLACEHOLDERS }, (_, i) => (
            <DoctorCardSkeleton key={i} />
          ))}
        </div>
      </Band>
    );
  }
  if (doctors.length === 0) {
    return (
      <Band className={className}>
        {heading()}
        <EmptyState title={t('home.noDoctors')} />
      </Band>
    );
  }
  return (
    <Band className={className}>
      <Carousel label={title} header={heading}>
        {doctors.slice(0, MAX_DOCTORS).map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
      </Carousel>
    </Band>
  );
}
