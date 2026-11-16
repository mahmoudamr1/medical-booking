'use client';

import Link from 'next/link';
import { MapPin, Phone } from 'lucide-react';
import { ClinicLogo } from '@/components/shared/MediaFallback';
import { useFormat, useT } from '@/i18n/provider';
import { asArray } from '@/lib/utils';
import type { Branch } from '@/types/api';

export function BranchCard({ branch: b }: { branch: Branch }) {
  const t = useT();
  const f = useFormat();
  const hours = [...asArray<NonNullable<Branch['hours']>[number]>(b.hours)].sort(
    (x, y) => ((x.day_of_week + 1) % 7) - ((y.day_of_week + 1) % 7),
  );
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <ClinicLogo name={f.l(b.clinic)} url={b.clinic?.logo_url} className="size-11" />
        <div className="min-w-0">
          {b.clinic ? (
            <Link href={`/clinics/${b.clinic.slug}`} className="font-medium hover:text-primary">
              {f.l(b.clinic)}
            </Link>
          ) : null}
          <p className="text-sm text-muted-foreground">{f.l(b)}</p>
        </div>
      </div>
      <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
        {[f.l(b, 'address'), f.l(b.area), f.l(b.city), f.l(b.governorate)]
          .filter(Boolean)
          .join('، ')}
      </p>
      {b.phone && (
        <a
          href={`tel:${b.phone}`}
          className="inline-flex min-h-9 items-center gap-1.5 text-sm text-primary"
          dir="ltr"
        >
          <Phone className="size-4" aria-hidden />
          {b.phone}
        </a>
      )}
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">{t('doctor.hours')}</p>
        {hours.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('doctor.noHours')}</p>
        ) : (
          <ul className="grid gap-0.5 text-xs">
            {hours.map((h, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{f.weekday(h.day_of_week)}</span>
                <span dir="ltr" className="tabular-nums">
                  {h.opens_at} – {h.closes_at}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
