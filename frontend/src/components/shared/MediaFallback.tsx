'use client';

import { useState, type ReactNode } from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Initials for a person/organisation name (drops "Dr."/"د." prefixes). Works for Arabic and Latin. */
export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '')
    .replace(/^(د\.|dr\.?)\s*/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

/**
 * Plain <img> (same-origin SVGs from the API need no next/image optimisation) with a fallback that
 * shows when there is no URL or the image fails to load.
 */
function ImageOr({
  src,
  alt,
  className,
  fallback,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(src)}
    />
  );
}

export function DoctorAvatar({
  name,
  url,
  className,
}: {
  name: string | null | undefined;
  url: string | null | undefined;
  className?: string;
}) {
  const base = cn(
    'aspect-square size-20 shrink-0 rounded-full text-lg ring-1 ring-slate-900/10',
    className,
  );
  return (
    <ImageOr
      src={url}
      alt={name ?? ''}
      className={cn(base, 'bg-muted object-cover object-top')}
      fallback={
        <span
          role="img"
          aria-label={name ?? ''}
          className={cn(
            base,
            'flex items-center justify-center bg-accent font-semibold text-primary',
          )}
        >
          <span aria-hidden>{initialsOf(name)}</span>
        </span>
      }
    />
  );
}

export function ClinicLogo({
  name,
  url,
  className,
}: {
  name: string | null | undefined;
  url: string | null | undefined;
  className?: string;
}) {
  const base = cn('size-12 shrink-0 rounded-xl', className);
  return (
    <ImageOr
      src={url}
      alt={name ?? ''}
      className={cn(base, 'border bg-card object-contain p-1')}
      fallback={
        <span
          role="img"
          aria-label={name ?? ''}
          className={cn(base, 'flex items-center justify-center bg-accent text-primary')}
        >
          <Building2 className="size-1/2" aria-hidden />
        </span>
      }
    />
  );
}

/** Same-origin avatar endpoint for a doctor when only the id is known (e.g. appointment payloads). */
export function doctorAvatarPath(doctorId: string | null | undefined): string | null {
  return doctorId ? `/api/v1/doctors/${doctorId}/avatar` : null;
}
