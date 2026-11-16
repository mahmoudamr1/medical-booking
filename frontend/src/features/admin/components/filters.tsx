'use client';

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/form';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

// ---- URL-backed filter state -----------------------------------------------------------

/**
 * Filters live in the query string so views are linkable (quick links from the overview,
 * browser back/forward) and survive reloads. Changing any filter resets `page`.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const serialized = params.toString();

  const values = useMemo(() => {
    const p = new URLSearchParams(serialized);
    return Object.fromEntries(keys.map((k) => [k, p.get(k) ?? ''])) as Record<K, string>;
    // keys is a static tuple per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  const set = useCallback(
    (patch: Partial<Record<K | 'page', string | number | null>>) => {
      const next = new URLSearchParams(serialized);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === '') next.delete(k);
        else next.set(k, String(v));
      }
      if (!('page' in patch)) next.delete('page');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [serialized, router, pathname],
  );

  const page = Math.max(1, Number(new URLSearchParams(serialized).get('page')) || 1);
  return { values, set, page };
}

// ---- Filter controls -------------------------------------------------------------------

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4',
        className,
      )}
      role="search"
    >
      {children}
    </div>
  );
}

/** Debounced search box; commits to the URL 400ms after typing stops or on Enter. */
export function SearchBox({
  value,
  onCommit,
  placeholder,
  label,
  id = 'admin-search',
  className,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  className?: string;
}) {
  const t = useT();
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Follow external changes (e.g. a filter set by clicking a table cell) without an effect.
  if (value !== synced) {
    setSynced(value);
    setText(value);
  }

  const commit = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    onCommit(v.trim());
  };

  return (
    <form
      className={cn('grid min-w-0 flex-1 basis-56 gap-1.5', className)}
      onSubmit={(e) => {
        e.preventDefault();
        commit(text);
      }}
    >
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label ?? t('admin.filters.search')}
      </Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={id}
          type="search"
          value={text}
          placeholder={placeholder ?? t('admin.filters.search')}
          className="ps-9"
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => onCommit(v.trim()), 400);
          }}
        />
      </div>
    </form>
  );
}

export function SelectFilter({
  id,
  label,
  value,
  onChange,
  options,
  allLabel,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('grid min-w-40 gap-1.5', className)}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

export function DateFilter({
  id,
  label,
  value,
  onChange,
  min,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="date"
        dir="ltr"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="w-40"
      />
    </div>
  );
}

export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const t = useT();
  return (
    <Badge variant="info" className="h-7 gap-1 pe-1">
      <span dir="auto" className="max-w-64 truncate">
        {label}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-sky-100"
        aria-label={t('admin.filters.removeFilter')}
      >
        <X className="size-3" aria-hidden />
      </button>
    </Badge>
  );
}

/** "2026-11-16" for <input type=date>, in the business timezone. */
export function dateInputValue(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Inclusive "to" date → exclusive upper bound for the API (`starts_at < to`). */
export function nextDay(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
