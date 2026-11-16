import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { TFunction } from '@/i18n/translate';
import { isApiError } from './client';

/** Human message for any error; API messages are already localized via Accept-Language. */
export function errorMessage(error: unknown, t: TFunction): string {
  if (isApiError(error)) {
    if (error.status === 0) return t('errors.network');
    if (error.status === 401) return t('errors.unauthenticated');
    if (error.status === 429) return error.message || t('errors.tooManyRequests');
    if (error.status >= 500) return t('errors.generic');
    return error.message || t('errors.generic');
  }
  return t('errors.generic');
}

/**
 * Maps a 422 `errors` bag onto react-hook-form fields. Unknown fields are ignored.
 * Returns true when at least one field error was applied.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
): boolean {
  if (!isApiError(error) || !error.errors) return false;
  let applied = false;
  for (const [field, messages] of Object.entries(error.errors)) {
    if (fields.includes(field) && messages[0]) {
      setError(field as Path<T>, { type: 'server', message: messages[0] });
      applied = true;
    }
  }
  return applied;
}
