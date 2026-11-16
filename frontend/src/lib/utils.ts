import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Defensive list access for API fields that should be arrays (never crash on a malformed payload). */
export function asArray<T>(value: T[] | null | undefined | unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
