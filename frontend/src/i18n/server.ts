import { cookies } from 'next/headers';
import { LOCALE_COOKIE, normalizeLocale } from './config';
import type { Locale } from '@/types/api';

/** Reads the locale cookie during server rendering (root layout sets <html lang dir>). */
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}
