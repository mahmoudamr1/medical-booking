'use client';

import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { useT } from '@/i18n/provider';
import { asArray } from '@/lib/utils';
import type { DoctorCard as DoctorCardData, Specialty } from '@/types/api';
import { publicApi } from '../../api';
import { directoryKeys } from '../../hooks/keys';
import type { HomeData } from '../../types';
import { SpecialtyCard } from '../SpecialtyCard';
import { Hero } from './Hero';
import { FeaturedClinics, JoinCta } from './HomeBands';
import { Band, SectionHeading } from './layout';
import { DoctorsRow, HowItWorks, Telemedicine, TrustStrip } from './sections';

/** Landing page. `urgentBanner` is composed by the route (urgent feature) and hidden when disabled. */
export function HomeScreen({ urgentBanner }: { urgentBanner: ReactNode }) {
  const t = useT();
  const home = useQuery({ queryKey: directoryKeys.home, queryFn: publicApi.home });
  const data = home.data;
  const specialties = asArray<Specialty>(data?.specialties);
  const clinics = asArray<HomeData['featured_clinics'][number]>(data?.featured_clinics);
  const availableSoon = asArray<DoctorCardData>(data?.available_soon);

  return (
    <MainLayout>
      <Hero
        specialties={specialties}
        doctors={
          availableSoon.length ? availableSoon : asArray<DoctorCardData>(data?.recommended_doctors)
        }
        loading={home.isPending}
      />
      <TrustStrip stats={data?.stats} loading={home.isPending} />

      <Band>
        <SectionHeading
          title={t('home.specialtiesTitle')}
          subtitle={t('home.specialtiesSubtitle')}
          href="/specialties"
          linkLabel={t('home.allSpecialtiesButton')}
        />
        {home.isPending ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : home.isError ? (
          <ErrorState error={home.error} onRetry={() => home.refetch()} />
        ) : specialties.length === 0 ? (
          <EmptyState title={t('specialties.empty')} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {specialties.slice(0, 8).map((s) => (
              <SpecialtyCard key={s.id} specialty={s} />
            ))}
          </div>
        )}
      </Band>

      <DoctorsRow
        title={t('home.recommendedTitle')}
        subtitle={t('home.recommendedSubtitle')}
        doctors={data?.recommended_doctors}
        loading={home.isPending}
        error={home.isError ? home.error : null}
        onRetry={() => home.refetch()}
        muted
      />

      {(home.isPending || availableSoon.length > 0) && (
        <DoctorsRow
          title={t('home.availableSoonTitle')}
          subtitle={t('home.availableSoonSubtitle')}
          doctors={data?.available_soon}
          loading={home.isPending}
        />
      )}

      <HowItWorks />
      {clinics.length > 0 && <FeaturedClinics clinics={clinics} />}
      <Telemedicine />
      {data?.urgent.enabled !== false && urgentBanner}
      <JoinCta />
    </MainLayout>
  );
}
