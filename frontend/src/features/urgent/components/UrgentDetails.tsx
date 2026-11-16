'use client';

import type { ReactNode } from 'react';
import { useFormat, useLocale, useT } from '@/i18n/provider';
import type { UrgentRequest } from '../types';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm break-words text-foreground">{children}</dd>
    </div>
  );
}

/** Request facts. Fields the viewer may not see (redacted) are simply null and omitted. */
export function UrgentDetails({
  request,
  showPatient = false,
}: {
  request: UrgentRequest;
  showPatient?: boolean;
}) {
  const t = useT();
  const f = useFormat();
  const { locale } = useLocale();
  const place = [f.l(request.area), f.l(request.city), f.l(request.governorate)]
    .filter(Boolean)
    .join(locale === 'ar' ? '، ' : ', ');
  const phone = request.patient?.contact_phone;

  return (
    <dl className="divide-y divide-border">
      {showPatient && request.patient && (
        <>
          {request.patient.name && (
            <Row label={t('urgent.details.patient')}>{request.patient.name}</Row>
          )}
          {phone && (
            <Row label={t('urgent.details.patientPhone')}>
              <a
                href={`tel:${phone}`}
                className="font-medium text-primary underline-offset-2 hover:underline"
                dir="ltr"
              >
                {phone}
              </a>
            </Row>
          )}
        </>
      )}
      <Row label={t('urgent.details.description')}>
        <p className="whitespace-pre-line">{request.description}</p>
      </Row>
      <Row label={t('urgent.details.specialty')}>
        {request.specialty ? f.l(request.specialty) : t('urgent.details.anySpecialty')}
      </Row>
      <Row label={t('urgent.details.consultationType')}>
        {t(`consultation.${request.consultation_type}`)}
      </Row>
      {place && <Row label={t('urgent.details.location')}>{place}</Row>}
      {request.location_details && (
        <Row label={t('urgent.details.locationDetails')}>{request.location_details}</Row>
      )}
      {request.created_at && (
        <Row label={t('urgent.details.createdAt')}>{f.dateTime(request.created_at)}</Row>
      )}
    </dl>
  );
}
