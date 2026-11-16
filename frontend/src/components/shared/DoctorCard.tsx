'use client';

import Link from 'next/link';
import { BadgeCheck, CalendarClock, MapPin, Star, Video } from 'lucide-react';
import type { DoctorCard as DoctorCardData, Specialty } from '@/types/api';
import { DoctorAvatar } from './MediaFallback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from './states';
import { useFormat, useT } from '@/i18n/provider';
import { asArray, cn } from '@/lib/utils';

export function primarySpecialty(specialties: unknown): Specialty | undefined {
  const list = asArray<Specialty>(specialties);
  return list.find((s) => s.is_primary) ?? list[0];
}

export function RatingInline({
  avg,
  count,
  className,
}: {
  avg: number;
  count: number;
  className?: string;
}) {
  const t = useT();
  const f = useFormat();
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm', className)}>
      <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
      {count > 0 ? (
        <>
          <span className="font-semibold text-foreground">{f.number(avg)}</span>
          <span className="text-muted-foreground">
            ({t('doctor.reviewsCount', { count: f.number(count) })})
          </span>
        </>
      ) : (
        <span className="text-muted-foreground">{t('doctor.noRating')}</span>
      )}
    </span>
  );
}

export function DoctorCard({
  doctor,
  compact = false,
}: {
  doctor: DoctorCardData;
  compact?: boolean;
}) {
  const t = useT();
  const f = useFormat();
  const primary = primarySpecialty(doctor.specialties);
  const branch = doctor.primary_branch;
  const place = branch
    ? [f.l(branch.clinic), f.l(branch.city) || f.l(branch.governorate)].filter(Boolean).join(' · ')
    : null;
  const types = asArray<string>(doctor.consultation_types);

  return (
    <Card
      className="h-full gap-0 py-0 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md"
      data-testid="doctor-card"
    >
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start gap-4">
          <DoctorAvatar name={doctor.name} url={doctor.avatar_url} className="size-16" />
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="flex items-center gap-1.5 text-base leading-snug font-semibold">
              <Link
                href={`/doctor/${doctor.id}`}
                className="hover:text-primary focus-visible:text-primary"
              >
                {doctor.name}
              </Link>
              {doctor.verified && (
                <BadgeCheck
                  className="size-4 shrink-0 text-primary"
                  aria-label={t('doctor.verified')}
                />
              )}
            </h3>
            {primary && <p className="text-sm font-medium text-primary">{f.l(primary)}</p>}
            {f.l(doctor, 'title') && (
              <p className="line-clamp-1 text-sm text-muted-foreground">{f.l(doctor, 'title')}</p>
            )}
          </div>
        </div>

        <ul className="grid gap-2 text-sm text-muted-foreground">
          <li>
            <RatingInline avg={doctor.rating_avg} count={doctor.rating_count} />
            {doctor.years_experience ? (
              <span className="ms-2">
                · {t('doctor.experience', { count: f.number(doctor.years_experience) })}
              </span>
            ) : null}
          </li>
          {place && (
            <li className="flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{place}</span>
            </li>
          )}
          {!compact && (
            <li
              className={cn(
                'flex items-center gap-1.5',
                doctor.next_available_at && 'text-emerald-700',
              )}
            >
              <CalendarClock className="size-4 shrink-0" aria-hidden />
              {doctor.next_available_at
                ? t('doctor.nextAvailable', { when: f.dateTime(doctor.next_available_at) })
                : t('doctor.noAvailability')}
            </li>
          )}
        </ul>

        {types.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {types.map((type) => (
              <Badge key={type} variant="muted">
                {type === 'online' && <Video aria-hidden />}
                {t(`consultation.${type as 'online'}`)}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t px-5 py-4">
        <div className="text-sm">
          {doctor.min_price !== null && (
            <>
              <span className="text-muted-foreground">{t('doctor.feeFrom')} </span>
              <span className="font-semibold text-foreground">{f.money(doctor.min_price)}</span>
            </>
          )}
        </div>
        <Button asChild size="sm">
          <Link href={`/doctor/${doctor.id}#booking`}>{t('doctor.book')}</Link>
        </Button>
      </div>
    </Card>
  );
}

export function DoctorCardSkeleton() {
  return (
    <Card className="h-full gap-4 p-5" aria-hidden>
      <div className="flex gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-10 w-full" />
    </Card>
  );
}
