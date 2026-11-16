'use client';

import { FileText } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { adminApi } from '../api';
import { useFormat, useT } from '@/i18n/provider';
import type { AdminDoctor } from '../types';

/** Verification documents of a doctor, each downloadable through the audited admin endpoint. */
export function DoctorDocuments({ doctor }: { doctor: AdminDoctor }) {
  const t = useT();
  const f = useFormat();
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">{t('admin.doctors.documents')}</h3>
      {doctor.documents?.length ? (
        <ul className="divide-y rounded-xl ring-1 ring-foreground/10">
          {doctor.documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center gap-3 p-3">
              <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t(`doctorDash.docTypes.${doc.type}`)}</p>
                <p className="truncate text-xs text-muted-foreground" dir="auto">
                  {doc.original_name} ·{' '}
                  {t('admin.doctors.sizeKb', { size: f.number(doc.size / 1024, 0) })}
                  {doc.uploaded_at && (
                    <>
                      {' '}
                      ·{' '}
                      {t('admin.doctors.uploadedAt', {
                        date: f.date(doc.uploaded_at, undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }),
                      })}
                    </>
                  )}
                </p>
              </div>
              {/* Same-origin, cookie-authenticated stream; the access is audit-logged by the API. */}
              <a
                href={adminApi.documentUrl(doctor.id, doc.id)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                {t('admin.doctors.download')}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t('admin.doctors.noDocuments')}</p>
      )}
    </section>
  );
}
