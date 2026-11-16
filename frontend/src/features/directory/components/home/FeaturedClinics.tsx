'use client';

import Link from 'next/link';
import { ClinicLogo } from '@/components/shared/MediaFallback';
import { useFormat, useT } from '@/i18n/provider';
import type { FeaturedClinic } from '../../types';
import { Band } from '../Band';
import { ForwardArrow } from '../ForwardArrow';
import { SectionHeading } from './SectionHeading';

const MAX_CLINICS = 6;

export function FeaturedClinics({ clinics }: { clinics: FeaturedClinic[] }) {
  const t = useT();
  const f = useFormat();
  return (
    <Band>
      <SectionHeading
        title={t('home.clinicsTitle')}
        link={{ href: '/clinics', label: t('home.allClinicsButton') }}
      />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {clinics.slice(0, MAX_CLINICS).map((clinic) => (
          <li key={clinic.id}>
            <Link
              href={`/clinics/${clinic.slug}`}
              className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm motion-reduce:transform-none"
            >
              <ClinicLogo name={f.l(clinic)} url={clinic.logo_url} className="size-12" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium group-hover:text-primary">
                  {f.l(clinic)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t('home.branches', { count: f.number(clinic.branches_count) })}
                </span>
              </span>
              <ForwardArrow className="text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </Band>
  );
}
