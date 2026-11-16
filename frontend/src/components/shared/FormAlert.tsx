'use client';

/** Inline form-level error or success message (e.g. the API's message after submit). */
export function FormAlert({
  message,
  tone = 'error',
}: {
  message: string | null;
  tone?: 'error' | 'success';
}) {
  if (!message) return null;
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={
        tone === 'error'
          ? 'rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
          : 'rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'
      }
    >
      {message}
    </p>
  );
}
