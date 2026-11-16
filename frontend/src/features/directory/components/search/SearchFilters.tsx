'use client';

import { useState, type FormEvent } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, NativeSelect } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFormat, useI18n } from '@/i18n/provider';
import { todayKey, BUSINESS_TZ } from '@/lib/dates';
import { useAreas, useCities, useGovernorates, useSpecialties } from '../../hooks/useLookups';
import type { DoctorSearchParams } from '../../types';
import type { Update } from './searchParams';

export function SearchFilters({
  params,
  update,
  activeCount,
  onClear,
}: {
  params: DoctorSearchParams;
  update: Update;
  activeCount: number;
  onClear: () => void;
}) {
  const { t } = useI18n();
  const f = useFormat();
  const [q, setQ] = useState(params.q ?? '');
  const [minPrice, setMinPrice] = useState(params.min_price ?? '');
  const [maxPrice, setMaxPrice] = useState(params.max_price ?? '');

  const specialties = useSpecialties();
  const governorates = useGovernorates();
  const cities = useCities(params.governorate ?? '');
  const areas = useAreas(params.city ?? '');

  const submitText = (e: FormEvent) => {
    e.preventDefault();
    update({ q: q.trim() || null, min_price: minPrice || null, max_price: maxPrice || null });
  };

  return (
    <form onSubmit={submitText} className="grid gap-5" data-testid="search-filters">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t('search.filters')}</h2>
        {activeCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={onClear}
          >
            <X aria-hidden />
            {t('search.clear')}
          </Button>
        )}
      </div>

      <Field label={t('search.keyword')} htmlFor="f-q">
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="f-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="ps-9"
            maxLength={100}
          />
        </div>
      </Field>

      <Field label={t('search.specialty')} htmlFor="f-specialty">
        <NativeSelect
          id="f-specialty"
          value={params.specialty ?? ''}
          onChange={(e) => update({ specialty: e.target.value || null })}
        >
          <option value="">{t('common.all')}</option>
          {specialties.data?.map((s) => (
            <option key={s.id} value={s.slug}>
              {f.l(s)}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label={t('search.governorate')} htmlFor="f-gov">
        <NativeSelect
          id="f-gov"
          value={params.governorate ?? ''}
          onChange={(e) => update({ governorate: e.target.value || null, city: null, area: null })}
        >
          <option value="">{t('common.all')}</option>
          {governorates.data?.map((g) => (
            <option key={g.id} value={g.id}>
              {f.l(g)}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label={t('search.city')} htmlFor="f-city">
        <NativeSelect
          id="f-city"
          value={params.city ?? ''}
          disabled={!params.governorate}
          onChange={(e) => update({ city: e.target.value || null, area: null })}
        >
          <option value="">{t('common.all')}</option>
          {cities.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {f.l(c)}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label={t('search.area')} htmlFor="f-area">
        <NativeSelect
          id="f-area"
          value={params.area ?? ''}
          disabled={!params.city || (areas.data?.length ?? 0) === 0}
          onChange={(e) => update({ area: e.target.value || null })}
        >
          <option value="">{t('common.all')}</option>
          {areas.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {f.l(a)}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">{t('search.priceRange')}</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            aria-label={t('search.minPrice')}
            placeholder={t('search.minPrice')}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            aria-label={t('search.maxPrice')}
            placeholder={t('search.maxPrice')}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </fieldset>

      <Field label={t('search.rating')} htmlFor="f-rating">
        <NativeSelect
          id="f-rating"
          value={params.min_rating ?? ''}
          onChange={(e) => update({ min_rating: e.target.value || null })}
        >
          <option value="">{t('search.anyRating')}</option>
          {[4.5, 4, 3].map((v) => (
            <option key={v} value={v}>
              {t('search.ratingAtLeast', { value: f.number(v) })}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label={t('search.consultationType')} htmlFor="f-type">
        <NativeSelect
          id="f-type"
          value={params.consultation_type ?? ''}
          onChange={(e) => update({ consultation_type: e.target.value || null })}
        >
          <option value="">{t('search.anyType')}</option>
          {(['in_person', 'online', 'home_visit'] as const).map((c) => (
            <option key={c} value={c}>
              {t(`consultation.${c}`)}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label={t('search.availableOn')} htmlFor="f-date">
        <Input
          id="f-date"
          type="date"
          min={todayKey(BUSINESS_TZ)}
          value={params.available_on ?? ''}
          onChange={(e) => update({ available_on: e.target.value || null })}
        />
      </Field>

      <Button type="submit" className="w-full">
        {t('search.apply')}
      </Button>
    </form>
  );
}
