'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Building2, Search, X } from 'lucide-react';
import { ClinicCard, ClinicCardSkeleton } from '../ClinicCard';
import { clinicDirectoryApi } from '../../api';
import { CLINIC_TYPES } from '../../types';
import { clinicKeys } from '../../hooks/keys';
import { LocationCascade } from '@/features/directory';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { Pagination } from '@/components/shared/Pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

export function ClinicDirectoryScreen() {
  return (
    <Suspense fallback={<LoadingState className="py-24" />}>
      <ClinicsDirectory />
    </Suspense>
  );
}

function ClinicsDirectory() {
  const t = useT();
  const f = useFormat();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = sp.get('q') ?? '';
  const governorate = sp.get('governorate') ?? '';
  const city = sp.get('city') ?? '';
  const type = CLINIC_TYPES.find((x) => x === sp.get('type')) ?? '';
  const page = Number(sp.get('page') ?? '1') || 1;
  const [keyword, setKeyword] = useState(q);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in changes)) next.delete('page');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: 'page' in changes });
  };

  const results = useQuery({
    queryKey: clinicKeys.directory({ q, governorate, city, type, page }),
    queryFn: () =>
      clinicDirectoryApi.list({
        q: q || undefined,
        governorate: governorate || undefined,
        city: city || undefined,
        type: type || undefined,
        page: String(page),
        per_page: '12',
      }),
    placeholderData: keepPreviousData,
  });

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    update({ q: keyword.trim() || null });
  };
  const hasFilters = !!(q || governorate || city || type);

  return (
    <div className="container-page space-y-6 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{t('clinic.directory.title')}</h1>
        <p className="max-w-2xl text-muted-foreground">{t('clinic.directory.subtitle')}</p>
      </header>

      <section
        className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
        aria-label={t('common.search')}
      >
        <form onSubmit={onSearch} className="grid gap-2" role="search">
          <Label htmlFor="clinic-q">{t('clinic.directory.keyword')}</Label>
          <div className="flex gap-2">
            <Input
              id="clinic-q"
              value={keyword}
              maxLength={100}
              placeholder={t('clinic.directory.keywordPlaceholder')}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Button type="submit">
              <Search aria-hidden />
              <span className="max-sm:sr-only">{t('common.search')}</span>
            </Button>
          </div>
        </form>
        <div
          role="group"
          aria-label={t('clinic.directory.typeFilter')}
          className="flex flex-wrap gap-2"
        >
          {(['', ...CLINIC_TYPES] as const).map((value) => {
            const active = value === type;
            return (
              <button
                key={value || 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => update({ type: value || null })}
                className={cn(
                  'inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:border-primary/40 hover:text-primary',
                )}
              >
                {value
                  ? t(`clinic.directory.typesPlural.${value}`)
                  : t('clinic.directory.types.all')}
              </button>
            );
          })}
        </div>
        <LocationCascade
          idPrefix="clinic-loc"
          value={{ governorate, city, area: '' }}
          onChange={(v) => update({ governorate: v.governorate || null, city: v.city || null })}
          labels={{
            governorate: t('clinic.directory.governorate'),
            city: t('clinic.directory.city'),
            anyGovernorate: t('common.all'),
            anyCity: governorate ? t('common.all') : t('clinic.directory.chooseGovernorateFirst'),
          }}
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setKeyword('');
              router.push(pathname);
            }}
          >
            <X aria-hidden />
            {t('clinic.directory.clear')}
          </Button>
        )}
      </section>

      {results.isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <ClinicCardSkeleton key={i} />
          ))}
        </div>
      ) : results.isError ? (
        <ErrorState error={results.error} onRetry={() => results.refetch()} />
      ) : results.data.items.length === 0 ? (
        <EmptyState
          icon={<Building2 aria-hidden />}
          title={t('clinic.directory.noResults')}
          description={t('clinic.directory.noResultsHint')}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t('clinic.directory.results', { count: f.number(results.data.pagination.total) })}
          </p>
          <div className={results.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.data.items.map((c) => (
                <ClinicCard key={c.id} clinic={c} />
              ))}
            </div>
          </div>
          <Pagination
            meta={results.data.pagination}
            onPageChange={(p) => update({ page: String(p) })}
          />
        </>
      )}

      <aside className="flex flex-col items-start gap-3 rounded-2xl border border-dashed bg-accent/40 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-semibold">{t('clinic.extra.manageCta')}</p>
          <p className="text-sm text-muted-foreground">{t('clinic.extra.manageCtaBody')}</p>
        </div>
        <Link href="/dashboard/clinic" className={buttonVariants({ variant: 'outline' })}>
          {t('clinic.extra.manageCtaButton')}
        </Link>
      </aside>
    </div>
  );
}
