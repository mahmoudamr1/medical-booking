/** URL ⇄ search filter mapping for the doctor directory. */
import type { DoctorSearchParams } from '../../types';

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
  'sort',
  'page',
] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

export type Update = (
  changes: Partial<Record<FilterKey, string | null>>,
  keepPage?: boolean,
) => void;

export const SORTS = [
  ['recommended', 'search.sortRecommended'],
  ['rating', 'search.sortRating'],
  ['price_asc', 'search.sortPriceAsc'],
  ['price_desc', 'search.sortPriceDesc'],
  ['next_available', 'search.sortNextAvailable'],
  ['experience', 'search.sortExperience'],
] as const;

export function paramsFromUrl(sp: URLSearchParams): DoctorSearchParams {
  const params: DoctorSearchParams = { per_page: '12' };
  for (const key of FILTER_KEYS) {
    const v = sp.get(key);
    if (v) params[key] = v;
  }
  return params;
}
