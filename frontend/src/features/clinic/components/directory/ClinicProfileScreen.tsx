'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ClinicLogo } from '@/components/shared/MediaFallback';
import { ClinicTypeBadge } from '../ClinicCard';
import { clinicDirectoryApi } from '../../api';
import { BranchHoursList } from '../BranchHoursList';
import { clinicKeys } from '../../hooks/keys';
import { ArrowRight, Building2, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { DoctorCard } from '@/components/shared/DoctorCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState, LoadingState, Section } from '@/components/shared/states';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { isApiError } from '@/lib/api/client';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

export function ClinicProfileScreen({ slug }: { slug: string }) {
  const t = useT();
  const f = useFormat();

  const query = useQuery({
    queryKey: clinicKeys.profile(slug),
    queryFn: () => clinicDirectoryApi.show(slug),
    retry: (count, e) => !(isApiError(e) && e.status === 404) && count < 2,
  });

  const back = (
    <Link
      href="/clinics"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
    >
      <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
      {t('clinic.profile.backToDirectory')}
    </Link>
  );

  if (query.isPending) return <LoadingState className="py-24" />;
  if (query.isError) {
    const notFound = isApiError(query.error) && query.error.status === 404;
    return (
      <div className="container-page space-y-4 py-10">
        {back}
        {notFound ? (
          <EmptyState
            icon={<Building2 aria-hidden />}
            title={t('clinic.profile.notFoundTitle')}
            description={t('clinic.profile.notFoundBody')}
          />
        ) : (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        )}
      </div>
    );
  }

  const clinic = query.data;
  const description = f.l(clinic, 'description');
  const doctorName = new Map(clinic.doctors.map((d) => [d.id, d.name]));

  return (
    <div className="container-page space-y-6 py-8">
      {back}
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-start sm:p-6">
        <ClinicLogo name={f.l(clinic)} url={clinic.logo_url} className="size-20 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{f.l(clinic)}</h1>
            <ClinicTypeBadge clinic={clinic} />
          </div>
          {description && <p className="max-w-3xl text-muted-foreground">{description}</p>}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>
              {t('clinic.directory.branchesCount', { count: f.number(clinic.branches.length) })}
            </span>
            <span>
              {t('clinic.directory.doctorsCount', { count: f.number(clinic.doctors.length) })}
            </span>
          </div>
        </div>
        {(clinic.phone || clinic.email) && (
          <div className="space-y-2 rounded-xl bg-muted/50 p-4 text-sm sm:min-w-56">
            <p className="font-semibold">{t('clinic.profile.contact')}</p>
            {clinic.phone && (
              <a
                href={`tel:${clinic.phone}`}
                className="flex items-center gap-2 hover:text-primary"
              >
                <Phone className="size-4" aria-hidden />
                <span dir="ltr">{clinic.phone}</span>
              </a>
            )}
            {clinic.email && (
              <a
                href={`mailto:${clinic.email}`}
                className="flex items-center gap-2 break-all hover:text-primary"
              >
                <Mail className="size-4 shrink-0" aria-hidden />
                {clinic.email}
              </a>
            )}
          </div>
        )}
      </header>

      <Section title={t('clinic.profile.branchesTitle')}>
        {clinic.branches.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('clinic.profile.noBranches')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {clinic.branches.map((b) => {
              const place = [f.l(b.area), f.l(b.city), f.l(b.governorate)]
                .filter(Boolean)
                .join('، ');
              return (
                <article
                  key={b.id}
                  data-testid="clinic-branch"
                  className="space-y-3 rounded-xl border p-4"
                >
                  <h3 className="font-semibold">{f.l(b)}</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                      <span>{[f.l(b, 'address'), place].filter(Boolean).join(' — ')}</span>
                    </li>
                    {b.phone && (
                      <li className="flex items-center gap-2">
                        <Phone className="size-4 shrink-0" aria-hidden />
                        <a href={`tel:${b.phone}`} dir="ltr" className="hover:text-primary">
                          {b.phone}
                        </a>
                      </li>
                    )}
                  </ul>
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="size-4" aria-hidden />
                      {t('clinic.profile.hours')}
                    </p>
                    <BranchHoursList hours={b.hours} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t('clinic.profile.doctorsTitle')}</h2>
        {clinic.doctors.length === 0 ? (
          <EmptyState title={t('clinic.profile.noDoctors')} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {clinic.doctors.map((d) => (
              <DoctorCard key={d.id} doctor={d} />
            ))}
          </div>
        )}
      </section>

      <Section title={t('clinic.profile.servicesTitle')}>
        {clinic.services.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('clinic.profile.noServices')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t('clinic.profile.service')}</TableHead>
                  <TableHead className="text-start">{t('clinic.profile.doctor')}</TableHead>
                  <TableHead className="text-start">{t('clinic.profile.type')}</TableHead>
                  <TableHead className="text-start">{t('clinic.profile.duration')}</TableHead>
                  <TableHead className="text-start">{t('clinic.profile.price')}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t('common.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinic.services.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {f.l(s)}
                      {s.branch && (
                        <span className="block text-xs text-muted-foreground">{f.l(s.branch)}</span>
                      )}
                    </TableCell>
                    <TableCell>{doctorName.get(s.doctor_id) ?? '—'}</TableCell>
                    <TableCell>{t(`consultation.${s.consultation_type}`)}</TableCell>
                    <TableCell>
                      {t('common.minutes', { count: f.number(s.duration_minutes) })}
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-700">
                      {f.money(s.price)}
                    </TableCell>
                    <TableCell className="text-end">
                      <Link
                        href={`/doctor/${s.doctor_id}#booking`}
                        className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
                      >
                        {t('clinic.profile.book')}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </div>
  );
}
