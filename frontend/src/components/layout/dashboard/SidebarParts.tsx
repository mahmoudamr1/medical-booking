'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HeartPulse } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFormat, useI18n } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { activeNavItem, type DashboardNavGroup, type DashboardNavItem } from './nav-types';

/*
 * The sidebar has three display modes, set as data-mode on a `group/sb` ancestor:
 *   expanded – full width with labels (phone sheet, tablet when opened)
 *   rail     – 72px icon rail (desktop when collapsed)
 *   auto     – rail below 1024px, expanded from 1024px (default; no layout flash before hydration)
 * The class lists below are literal so Tailwind can see them.
 */
export const RAIL = {
  /** Removed in rail mode. */
  hide: 'group-data-[mode=rail]/sb:hidden max-lg:group-data-[mode=auto]/sb:hidden',
  /** Visually hidden in rail mode (keeps the accessible name). */
  srOnly: 'group-data-[mode=rail]/sb:sr-only max-lg:group-data-[mode=auto]/sb:sr-only',
  /** Centered, no inline padding in rail mode. */
  center:
    'group-data-[mode=rail]/sb:justify-center group-data-[mode=rail]/sb:px-0 max-lg:group-data-[mode=auto]/sb:justify-center max-lg:group-data-[mode=auto]/sb:px-0',
  /** Shown only in rail mode. */
  only: 'hidden group-data-[mode=rail]/sb:flex max-lg:group-data-[mode=auto]/sb:flex',
} as const;

export function Brand({ homeHref }: { homeHref: string }) {
  const { t } = useI18n();
  return (
    <Link
      href={homeHref}
      className={cn('flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg', RAIL.center)}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <HeartPulse className="size-5" aria-hidden />
      </span>
      <span className={cn('truncate text-[15px] font-semibold text-foreground', RAIL.srOnly)}>
        {t('common.appName')}
      </span>
    </Link>
  );
}

function CountBadge({ item, active }: { item: DashboardNavItem; active: boolean }) {
  const f = useFormat();
  const { t } = useI18n();
  if (item.badge === undefined || item.badge === 0) return null;
  const tone = item.badgeTone ?? 'primary';
  const toneCls = active
    ? 'bg-primary-foreground/20 text-primary-foreground'
    : tone === 'danger'
      ? 'bg-red-100 text-red-800'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-900'
        : 'bg-accent text-accent-foreground ring-1 ring-primary/15';
  const dotCls =
    tone === 'danger' ? 'bg-red-500' : tone === 'warning' ? 'bg-amber-500' : 'bg-primary';
  const label =
    item.badge === 'dot'
      ? t('dashboard.sidebar.needsAttention')
      : t('dashboard.sidebar.badge', { count: f.number(item.badge) });
  return (
    <>
      <span className="sr-only">({label})</span>
      {item.badge === 'dot' ? (
        <span
          className={cn(
            'size-2 shrink-0 rounded-full',
            active ? 'bg-primary-foreground' : dotCls,
            RAIL.hide,
          )}
          aria-hidden
        />
      ) : (
        <span
          className={cn(
            'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
            toneCls,
            RAIL.hide,
          )}
          aria-hidden
        >
          {item.badge > 99 ? '99+' : f.number(item.badge)}
        </span>
      )}
      {/* Rail: a small corner dot on the icon. */}
      <span
        className={cn(
          'absolute end-2.5 top-2 size-2 rounded-full ring-2 ring-sidebar',
          active ? 'bg-primary-foreground ring-primary' : dotCls,
          RAIL.only,
        )}
        aria-hidden
      />
    </>
  );
}

function NavLink({
  item,
  active,
  rail,
  onNavigate,
}: {
  item: DashboardNavItem;
  active: boolean;
  rail: boolean;
  onNavigate?: () => void;
}) {
  const { dir } = useI18n();
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      data-active={active || undefined}
      className={cn(
        'relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar motion-reduce:transition-none lg:min-h-10',
        RAIL.center,
        active
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
          : 'text-slate-600 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon className={cn('size-[18px] shrink-0', !active && 'text-slate-500')} aria-hidden />
      <span className={cn('min-w-0 flex-1 truncate', RAIL.srOnly)}>{item.label}</span>
      <CountBadge item={item} active={active} />
    </Link>
  );
  if (!rail) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side={dir === 'rtl' ? 'left' : 'right'} sideOffset={10}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export function NavGroups({
  groups,
  rail,
  onNavigate,
  label,
}: {
  groups: DashboardNavGroup[];
  rail: boolean;
  onNavigate?: () => void;
  label: string;
}) {
  const pathname = usePathname();
  const current = activeNavItem(pathname, groups);
  return (
    <nav aria-label={label} className="space-y-1">
      {groups.map((g, gi) =>
        g.items.length === 0 ? null : (
          <div key={g.label ?? gi} role="group" aria-label={g.label}>
            {g.label && (
              <p
                className={cn(
                  'px-3 pt-4 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase',
                  gi === 0 && 'pt-1',
                  RAIL.hide,
                )}
              >
                {g.label}
              </p>
            )}
            {gi > 0 && (
              <div
                className={cn('mx-auto my-3 h-px w-8 bg-sidebar-border', RAIL.only)}
                aria-hidden
              />
            )}
            <ul className="grid gap-0.5">
              {g.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    active={item === current}
                    rail={rail}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ),
      )}
    </nav>
  );
}
