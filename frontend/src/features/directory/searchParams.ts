/**
 * URL ⇄ doctor-search mapping. The URL is the single source of truth for the search page, so every
 * filter combination is a shareable link.
 */
import type { TranslationKey } from '@/i18n/translate';
import type { DoctorSearchParams } from './types';

export const SEARCH_PATH = '/search';
export const PAGE_SIZE = '12';
export const DEFAULT_SORT = 'recommended';

/** What a visitor can narrow the directory by (paging and sorting are not filters). */
export const FILTER_KEYS = [
  'q',
  'specialty',
  'governorate',
  'city',
  'area',
  'min_price',
  'max_price',
  'min_rating',
  'consultation_type',
  'available_on',
] as const;

const URL_KEYS = [...FILTER_KEYS, 'sort', 'page'] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];
export type SearchUrlKey = (typeof URL_KEYS)[number];
/** A falsy value removes the key from the URL. */
export type SearchChanges = Partial<Record<SearchUrlKey, string | null>>;

export const SORT_OPTIONS = [
  { value: 'recommended', labelKey: 'search.sortRecommended' },
  { value: 'rating', labelKey: 'search.sortRating' },
  { value: 'price_asc', labelKey: 'search.sortPriceAsc' },
  { value: 'price_desc', labelKey: 'search.sortPriceDesc' },
  { value: 'next_available', labelKey: 'search.sortNextAvailable' },
  { value: 'experience', labelKey: 'search.sortExperience' },
] as const satisfies readonly { value: string; labelKey: TranslationKey }[];

export const MIN_RATING_OPTIONS = [4.5, 4, 3] as const;

/** The API query for the current URL (unknown and empty params are ignored). */
export function paramsFromUrl(url: URLSearchParams): DoctorSearchParams {
  const params: DoctorSearchParams = { per_page: PAGE_SIZE };
  for (const key of URL_KEYS) {
    const value = url.get(key);
    if (value) params[key] = value;
  }
  return params;
}

/** A copy of `url` with `changes` applied. Any change other than paging goes back to page 1. */
export function withChanges(url: URLSearchParams, changes: SearchChanges): URLSearchParams {
  const next = new URLSearchParams(url);
  for (const [key, value] of Object.entries(changes)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  if (!('page' in changes)) next.delete('page');
  return next;
}

export function countActiveFilters(url: URLSearchParams): number {
  return FILTER_KEYS.filter((key) => url.get(key)).length;
}

/** Link to the search page with the given filters preset (empty values are skipped). */
export function searchHref(filters: Partial<Record<FilterKey, string>> = {}): string {
  const query = withChanges(new URLSearchParams(), filters).toString();
  return query ? `${SEARCH_PATH}?${query}` : SEARCH_PATH;
}
