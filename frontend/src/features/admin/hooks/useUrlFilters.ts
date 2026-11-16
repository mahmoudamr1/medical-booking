'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type FilterValues<K extends string> = Record<K, string>;
export type FilterPatch<K extends string> = Partial<Record<K | 'page', string | number | null>>;

/** The named filters of a query string; a missing one is ''. */
export function readFilters<K extends string>(search: string, keys: readonly K[]): FilterValues<K> {
  const params = new URLSearchParams(search);
  return Object.fromEntries(keys.map((key) => [key, params.get(key) ?? ''])) as FilterValues<K>;
}

/** 1-based page of a query string (anything invalid is page 1). */
export function readPage(search: string): number {
  const page = Number(new URLSearchParams(search).get('page'));
  return Number.isInteger(page) && page > 1 ? page : 1;
}

/**
 * Applies a patch to a query string: null/'' removes a param, and changing any filter goes back
 * to the first page unless the patch sets `page` itself.
 */
export function patchSearch(search: string, patch: FilterPatch<string>): string {
  const next = new URLSearchParams(search);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === '') next.delete(key);
    else next.set(key, String(value));
  }
  if (!('page' in patch)) next.delete('page');
  return next.toString();
}

/**
 * Filters live in the query string so views are linkable (quick links from the overview,
 * browser back/forward) and survive reloads.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const search = useSearchParams().toString();
  const router = useRouter();
  const pathname = usePathname();

  const set = useCallback(
    (patch: FilterPatch<K>) => {
      const next = patchSearch(search, patch);
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [search, router, pathname],
  );

  return { values: readFilters(search, keys), page: readPage(search), set };
}
