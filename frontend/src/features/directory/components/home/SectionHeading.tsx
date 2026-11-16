import Link from 'next/link';
import type { ReactNode } from 'react';
import { ForwardArrow } from '../ForwardArrow';

/** Section title row with an optional "see all" link and extra actions (e.g. carousel arrows). */
export function SectionHeading({
  title,
  subtitle,
  link,
  href,
  linkLabel,
  actions,
}: {
  title: string;
  subtitle?: string;
  link?: { href: string; label: string };
  href?: string;
  linkLabel?: string;
  actions?: ReactNode;
}) {
  const resolvedLink = link ?? (href && linkLabel ? { href, label: linkLabel } : undefined);
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-2xl space-y-1.5">
        <h2 className="text-[clamp(1.375rem,1.1rem+1vw,2rem)] leading-tight font-semibold">
          {title}
        </h2>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
      {(resolvedLink || actions) && (
        <div className="flex items-center gap-2">
          {resolvedLink && (
            <Link
              href={resolvedLink.href}
              className="group inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary hover:bg-accent"
            >
              {resolvedLink.label}
              <ForwardArrow />
            </Link>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}
