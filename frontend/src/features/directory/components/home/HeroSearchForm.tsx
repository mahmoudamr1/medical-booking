'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Search, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import type { Specialty } from '@/types/api';
import { useGovernorates } from '../../hooks/useLookups';
import { searchHref } from '../../searchParams';
import { LookupSelect } from '../LookupSelect';
import { SearchInput } from '../SearchInput';

/** Quick search on the landing page: submits to the search page with the chosen filters in the URL. */
export function HeroSearchForm({ specialties }: { specialties: Specialty[] }) {
  const t = useT();
  const router = useRouter();
  const governorates = useGovernorates();
  const [q, setQ] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [governorate, setGovernorate] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    router.push(searchHref({ q: q.trim(), specialty, governorate }));
  };

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className="grid gap-3 rounded-2xl border bg-card p-4 shadow-lg shadow-slate-900/5 sm:grid-cols-2 sm:p-5"
    >
      <SearchInput
        className="sm:col-span-2"
        aria-label={t('home.searchPlaceholder')}
        placeholder={t('home.searchPlaceholder')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        maxLength={100}
      />
      <LookupSelect
        label={t('search.specialty')}
        icon={<Stethoscope />}
        options={specialties}
        valueOf={(s) => s.slug}
        value={specialty}
        onChange={setSpecialty}
        placeholder={t('home.allSpecialties')}
      />
      <LookupSelect
        label={t('search.governorate')}
        icon={<MapPin />}
        options={governorates.data}
        value={governorate}
        onChange={setGovernorate}
        placeholder={t('home.allGovernorates')}
      />
      <Button type="submit" size="lg" className="sm:col-span-2">
        <Search aria-hidden />
        {t('home.searchButton')}
      </Button>
    </form>
  );
}
