import { ar, type Dictionary } from './ar';
import { en } from './en';
import type { Locale } from '@/types/api';

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TranslationKey = Leaves<Dictionary>;
export type TranslateVars = Record<string, string | number>;
export type TFunction = (key: TranslationKey, vars?: TranslateVars) => string;

export const dictionaries: Record<Locale, Dictionary> = { ar, en };

/** Resolves a dot-path key and interpolates {placeholders}. Unknown keys return the key itself. */
export function translate(dict: Dictionary, key: string, vars?: TranslateVars): string {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  if (typeof node !== 'string') return key;
  if (!vars) return node;
  return node.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function createT(locale: Locale): TFunction {
  const dict = dictionaries[locale];
  return (key, vars) => translate(dict, key, vars);
}
