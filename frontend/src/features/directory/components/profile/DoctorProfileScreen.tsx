'use client';

import { BranchCard } from './BranchCard';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Clock, GraduationCap, MapPin, ShieldCheck, Video } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { BookingPanel } from '@/features/booking';
import { DoctorAvatar } from '@/components/shared/MediaFallback';
import { RatingInline } from '@/components/shared/DoctorCard';
import { DoctorReviews } from '@/features/reviews';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState, Section, Skeleton } from '@/components/shared/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { publicApi } from '../../api';
import { directoryKeys } from '../../hooks/keys';
import { isApiError } from '@/lib/api/client';
import { useFormat, useT } from '@/i18n/provider';
import { asArray } from '@/lib/utils';
import type { Branch, Service, Specialty } from '@/types/api';

export function DoctorProfileScreen() {
  const t = useT();
  const f = useFormat();
  const { id } = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: directoryKeys.doctor(id),
    queryFn: () => publicApi.doctor(id),
  });

  if (query.isPending) {
    return (
      <MainLayout>
        <div className="container-page grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  if (query.isError) {
    return (
      <MainLayout>
        <div className="container-page py-16">
          {isApiError(query.error) && query.error.status === 404 ? (
            <EmptyState
              title={t('doctor.notFound')}
              action={
                <Button asChild variant="outline">
                  <Link href="/search">{t('home.allDoctorsButton')}</Link>
                </Button>
              }
            />
          ) : (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          )}
        </div>
      </MainLayout>
    );
  }

  const d = query.data;
  const bio = f.l(d, 'bio');
  const specialties = asArray<Specialty>(d.specialties);
  const services = asArray<Service>(d.services);
  const branches = asArray<Branch>(d.branches);

  return (
    <MainLayout>
      <div className="container-page grid gap-6 py-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-8">
        <div className="min-w-0 space-y-6">
          <Card className="gap-0 overflow-hidden py-0">
            <div
              className="h-20 bg-[linear-gradient(120deg,oklch(0.93_0.04_185),oklch(0.97_0.02_200)_60%,oklch(0.95_0.03_165))] sm:h-24"
              aria-hidden
            />
            <div className="flex flex-col gap-5 px-5 pb-6 sm:flex-row sm:items-end sm:px-6">
              <DoctorAvatar
                name={d.name}
                url={d.avatar_url}
                className="-mt-12 size-24 border-4 border-card bg-card text-2xl shadow-sm sm:size-28"
              />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="space-y-1">
                  <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold sm:text-3xl">
                    {d.name}
                    {d.verified && (
                      <Badge variant="info">
                        <BadgeCheck aria-hidden />
                        {t('doctor.verified')}
                      </Badge>
                    )}
                  </h1>
                  {f.l(d, 'title') && <p className="text-muted-foreground">{f.l(d, 'title')}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {specialties.map((s) => (
                    <Link
                      key={s.id}
                      href={`/search?specialty=${s.slug}`}
                      className="inline-flex min-h-8 items-center rounded-full bg-accent px-3 text-sm text-accent-foreground hover:bg-accent/70"
                    >
                      {f.l(s)}
                    </Link>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <RatingInline avg={d.rating_avg} count={d.rating_count} />
                  {d.years_experience ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-4" aria-hidden />
                      {t('doctor.experience', { count: f.number(d.years_experience) })}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="size-4" aria-hidden />
                    {d.booking_mode === 'manual'
                      ? t('doctor.bookingManual')
                      : t('doctor.bookingInstant')}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 sm:px-6 lg:hidden">
              <Button asChild className="w-full" size="lg">
                <a href="#booking">{t('doctor.book')}</a>
              </Button>
            </div>
          </Card>

          {(bio || d.qualifications) && (
            <Section title={t('doctor.about')}>
              <div className="space-y-5">
                {bio && (
                  <p className="leading-relaxed whitespace-pre-line text-foreground/90">{bio}</p>
                )}
                {d.qualifications && (
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <GraduationCap className="size-4 text-primary" aria-hidden />
                      {t('doctor.qualifications')}
                    </h3>
                    <p className="text-sm whitespace-pre-line text-muted-foreground">
                      {d.qualifications}
                    </p>
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section
            title={t('doctor.services')}
            description={t('doctor.cancellationPolicy', {
              hours: f.number(d.min_cancellation_hours),
            })}
          >
            {services.length > 0 ? (
              <ul className="divide-y">
                {services.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{f.l(s)}</p>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        {s.consultation_type === 'online' ? (
                          <Video className="size-3.5" aria-hidden />
                        ) : (
                          <MapPin className="size-3.5" aria-hidden />
                        )}
                        {s.branch ? f.l(s.branch) : t(`consultation.${s.consultation_type}`)} ·{' '}
                        {t('common.minutes', { count: f.number(s.duration_minutes) })}
                      </p>
                    </div>
                    <span className="font-semibold">{f.money(s.price)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">{t('booking.noServices')}</p>
            )}
          </Section>

          {branches.length > 0 && (
            <Section title={t('doctor.locations')}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {branches.map((b) => (
                  <BranchCard key={b.id} branch={b} />
                ))}
              </div>
            </Section>
          )}

          <Section
            title={t('doctor.reviews')}
            actions={<RatingInline avg={d.rating_avg} count={d.rating_count} />}
          >
            <DoctorReviews doctorId={d.id} />
          </Section>
        </div>

        <aside id="booking" className="min-w-0 scroll-mt-20 lg:sticky lg:top-20 lg:self-start">
          <Card className="px-5">
            <h2 className="text-lg font-semibold">{t('booking.title')}</h2>
            <BookingPanel doctor={d} />
          </Card>
        </aside>
      </div>
    </MainLayout>
  );
}
