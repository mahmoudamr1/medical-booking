'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { SpecialtyCard, publicApi, directoryKeys } from '@/features/directory';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState, Skeleton } from '@/components/shared/states';
import { Input } from '@/components/ui/input';
import { useT } from '@/i18n/provider';

export default function SpecialtiesPage() {
  const t = useT();
  const [filter, setFilter] = useState('');
  const query = useQuery({
    queryKey: directoryKeys.specialties,
    queryFn: publicApi.specialties,
    staleTime: 10 * 60 * 1000,
  });

  const needle = filter.trim().toLowerCase();
  const items = (query.data ?? []).filter(
    (s) =>
      !needle ||
      s.name_ar.toLowerCase().includes(needle) ||
      (s.name_en ?? '').toLowerCase().includes(needle),
  );

  return (
    <MainLayout>
      <section className="border-b bg-card">
        <div className="container-page space-y-6 py-10 sm:py-12">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">{t('specialties.title')}</h1>
            <p className="text-muted-foreground">{t('specialties.subtitle')}</p>
          </div>
          <div className="relative max-w-xl">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t('specialties.filterPlaceholder')}
              aria-label={t('specialties.filterPlaceholder')}
              className="ps-9"
            />
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        {query.isPending ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState title={t('specialties.empty')} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((s) => (
              <SpecialtyCard key={s.id} specialty={s} showDescription />
            ))}
          </div>
        )}
      </section>
    </MainLayout>
  );
}
