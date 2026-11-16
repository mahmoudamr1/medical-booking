'use client';

import { Suspense, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Search } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { DoctorCard, DoctorCardSkeleton } from '@/components/shared/DoctorCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { Pagination } from '@/components/shared/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NativeSelect } from '@/components/ui/form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { publicApi } from '../../api';
import { directoryKeys } from '../../hooks/keys';
import { FILTER_KEYS, SORTS, paramsFromUrl, type Update } from './searchParams';
import { SearchFilters } from './SearchFilters';
import { useFormat, useI18n } from '@/i18n/provider';
import { cn } from '@/lib/utils';

export function SearchScreen() {
  return (
    <MainLayout>
      <Suspense fallback={<LoadingState className="py-24" />}>
        <SearchContent />
      </Suspense>
    </MainLayout>
  );
}

function SearchContent() {
  const { t, dir } = useI18n();
  const f = useFormat();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const params = paramsFromUrl(searchParams);

  /** Writes filters to the URL (single source of truth); any filter change resets to page 1. */
  const update: Update = (changes, keepPage = false) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!keepPage && !('page' in changes)) next.delete('page');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: keepPage });
  };

  const results = useQuery({
    queryKey: directoryKeys.doctors(searchParams.toString()),
    queryFn: () => publicApi.doctors(params),
    placeholderData: keepPreviousData,
  });

  const activeCount = FILTER_KEYS.filter(
    (k) => k !== 'page' && k !== 'sort' && searchParams.get(k),
  ).length;
  const clearAll = () => router.push(pathname);
  const filterKey = searchParams.toString();

  return (
    <div className="container-page space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold sm:text-3xl">{t('search.title')}</h1>
          {results.data && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {t('search.results', { count: f.number(results.data.pagination.total) })}
            </p>
          )}
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <SlidersHorizontal aria-hidden />
                {t('search.filters')}
                {activeCount > 0 && <Badge>{f.number(activeCount)}</Badge>}
              </Button>
            </SheetTrigger>
            <SheetContent
              side={dir === 'rtl' ? 'right' : 'left'}
              className="w-full max-w-sm overflow-y-auto p-0 sm:max-w-sm"
            >
              <SheetHeader className="border-b p-4">
                <SheetTitle className="text-start">{t('search.filters')}</SheetTitle>
              </SheetHeader>
              <div className="p-4">
                <SearchFilters
                  key={filterKey}
                  params={params}
                  update={(c) => {
                    update(c);
                    setSheetOpen(false);
                  }}
                  activeCount={activeCount}
                  onClear={() => {
                    clearAll();
                    setSheetOpen(false);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
          <label htmlFor="sort" className="sr-only">
            {t('search.sort')}
          </label>
          <NativeSelect
            id="sort"
            className="flex-1 sm:w-52 sm:flex-none"
            value={params.sort ?? 'recommended'}
            onChange={(e) =>
              update({ sort: e.target.value === 'recommended' ? null : e.target.value })
            }
          >
            {SORTS.map(([value, key]) => (
              <option key={value} value={value}>
                {t('search.sort')}: {t(key)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden lg:block" aria-label={t('search.filters')}>
          <Card className="sticky top-20 px-5">
            <SearchFilters
              key={filterKey}
              params={params}
              update={update}
              activeCount={activeCount}
              onClear={clearAll}
            />
          </Card>
        </aside>

        <section aria-busy={results.isFetching}>
          {results.isPending ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <DoctorCardSkeleton key={i} />
              ))}
            </div>
          ) : results.isError ? (
            <ErrorState error={results.error} onRetry={() => results.refetch()} />
          ) : results.data.items.length === 0 ? (
            <EmptyState
              icon={<Search />}
              title={t('search.noResults')}
              description={t('search.noResultsHint')}
              action={
                activeCount > 0 ? (
                  <Button variant="outline" onClick={clearAll}>
                    {t('search.clear')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div
                className={cn(
                  'grid gap-4 transition-opacity md:grid-cols-2 xl:grid-cols-3',
                  results.isFetching && 'opacity-60',
                )}
              >
                {results.data.items.map((d) => (
                  <DoctorCard key={d.id} doctor={d} />
                ))}
              </div>
              <Pagination
                meta={results.data.pagination}
                onPageChange={(p) => update({ page: p > 1 ? String(p) : null }, true)}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
