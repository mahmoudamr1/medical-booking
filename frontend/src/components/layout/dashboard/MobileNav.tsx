'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Ellipsis } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { DashboardNavGroup, DashboardNavItem } from './nav-types';
import { Brand, NavGroups } from './SidebarParts';
import { UserCard } from './UserCard';

/** Phone menu: the full navigation in a sheet from the inline-start side (right in Arabic). */
export function MobileNavSheet({
  open,
  onOpenChange,
  title,
  homeHref,
  nav,
  top,
  roleLabel,
  avatarUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  homeHref: string;
  nav: DashboardNavGroup[];
  top?: ReactNode;
  roleLabel?: string;
  avatarUrl?: string | null;
}) {
  const { t, dir } = useI18n();
  const close = () => onOpenChange(false);
  const label = t('dashboard.sidebar.label');
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={dir === 'rtl' ? 'right' : 'left'}
        className="gap-0 bg-sidebar p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] data-[side=left]:w-[min(20rem,88vw)] data-[side=right]:w-[min(20rem,88vw)] md:hidden"
      >
        <div data-mode="expanded" className="group/sb flex h-full min-h-0 flex-col">
          <div className="flex h-16 shrink-0 items-center px-4 pe-14">
            <Brand homeHref={homeHref} />
          </div>
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <SheetDescription className="sr-only">{label}</SheetDescription>
          {top && <div className="shrink-0 px-3 pb-2">{top}</div>}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
            <NavGroups groups={nav} rail={false} label={label} onNavigate={close} />
          </div>
          <div className="shrink-0 border-t border-sidebar-border p-3">
            <UserCard roleLabel={roleLabel} avatarUrl={avatarUrl} onNavigate={close} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Phone bottom tab bar: up to four main items, plus "More" (opens the sheet) when there are others. */
export function BottomTabBar({
  tabs,
  current,
  hasMore,
  onMore,
}: {
  tabs: DashboardNavItem[];
  current?: DashboardNavItem;
  hasMore: boolean;
  onMore: () => void;
}) {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t('dashboard.sidebar.bottomNav')}
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_-8px_rgb(15_23_42/0.15)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg auto-cols-fr grid-flow-col">
        {tabs.map((item) => (
          <li key={item.href}>
            <TabLink item={item} active={item === current} />
          </li>
        ))}
        {hasMore && (
          <li>
            <button type="button" onClick={onMore} className={tabCls(false)}>
              <span className="flex h-7 w-12 items-center justify-center rounded-full">
                <Ellipsis className="size-5" aria-hidden />
              </span>
              {t('dashboard.sidebar.more')}
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}

const tabCls = (active: boolean) =>
  cn(
    'flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
    active ? 'text-primary' : 'text-slate-600',
  );

function TabLink({ item, active }: { item: DashboardNavItem; active: boolean }) {
  const Icon = item.icon;
  const showBadge = item.badge !== undefined && item.badge !== 0;
  return (
    <Link href={item.href} aria-current={active ? 'page' : undefined} className={tabCls(active)}>
      <span
        className={cn(
          'relative flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150 motion-reduce:transition-none',
          active && 'bg-accent ring-1 ring-primary/15',
        )}
      >
        <Icon className="size-5" aria-hidden />
        {showBadge && (
          <span
            className="absolute end-2 top-0.5 size-2 rounded-full bg-amber-500 ring-2 ring-card"
            aria-hidden
          />
        )}
      </span>
      <span className="w-full truncate text-center">{item.label}</span>
    </Link>
  );
}
