'use client';

import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFormat, useI18n } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { AdminDoctor } from '../types';
import { DetailList } from './DetailList';
import { DoctorDocuments } from './DoctorDocuments';

/** Read-only profile, specialties, documents and practice locations of a doctor under review. */
export function DoctorProfileSections({ doctor: d }: { doctor: AdminDoctor }) {
  const { t } = useI18n();
  const f = useFormat();
  return (
    <>
      <section className="space-y-3">
        <h3 className="font-semibold">{t('admin.doctors.profile')}</h3>
        <DetailList
          rows={[
            [t('admin.doctors.title_'), f.l(d, 'title')],
            [
              t('admin.doctors.license'),
              d.license_number ? (
                <span dir="ltr" className="font-mono">
                  {d.license_number}
                </span>
              ) : null,
            ],
            [
              t('admin.doctors.experience'),
              d.years_experience !== null
                ? t('common.years', { count: f.number(d.years_experience) })
                : null,
            ],
            [t('admin.doctors.gender'), d.gender ? t(`admin.doctors.genders.${d.gender}`) : null],
            [
              t('admin.doctors.submittedAt'),
              d.verification_submitted_at ? f.dateTime(d.verification_submitted_at) : null,
            ],
            [t('admin.doctors.verifiedAt'), d.verified_at ? f.dateTime(d.verified_at) : null],
            [
              t('admin.doctors.rating'),
              <span key="r" className="inline-flex items-center gap-1">
                <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
                {t('admin.doctors.ratingValue', {
                  avg: f.number(d.rating_avg),
                  count: f.number(d.rating_count),
                })}
              </span>,
            ],
            [t('admin.doctors.accountActive'), d.is_active ? t('common.yes') : t('common.no')],
            [t('admin.doctors.qualifications'), d.qualifications],
          ]}
        />
        {(d.bio_ar || d.bio_en) && (
          <DetailList
            className="sm:grid-cols-1"
            rows={[
              [t('admin.doctors.bioAr'), d.bio_ar],
              [t('admin.doctors.bioEn'), d.bio_en],
            ]}
          />
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="font-semibold">{t('admin.doctors.specialties')}</h3>
        {d.specialties?.length ? (
          <div className="flex flex-wrap gap-2">
            {d.specialties.map((s) => (
              <Badge key={s.id} variant={s.is_primary ? 'info' : 'muted'}>
                {f.l(s)}
                {s.is_primary && <span className="opacity-70">· {t('admin.doctors.primary')}</span>}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('admin.doctors.noSpecialties')}</p>
        )}
      </section>

      <DoctorDocuments doctor={d} />

      <section className="space-y-3">
        <h3 className="font-semibold">{t('admin.doctors.branches')}</h3>
        {d.branches?.length ? (
          <ul className="grid gap-2">
            {d.branches.map((b) => (
              <li
                key={b.id}
                className={cn(
                  'rounded-lg p-3 text-sm ring-1 ring-foreground/10',
                  !b.is_active && 'opacity-60',
                )}
              >
                <p className="font-medium">{[f.l(b.clinic), f.l(b)].filter(Boolean).join(' – ')}</p>
                <p className="text-xs text-muted-foreground">
                  {[f.l(b, 'address'), f.l(b.area), f.l(b.city), f.l(b.governorate)]
                    .filter(Boolean)
                    .join('، ')}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t('admin.doctors.noBranches')}</p>
        )}
      </section>
    </>
  );
}
