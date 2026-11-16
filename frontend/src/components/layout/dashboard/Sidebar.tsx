'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { DashboardNavGroup } from './nav-types';
import { Brand, NavGroups, RAIL } from './SidebarParts';
import { UserCard } from './UserCard';
import { useMediaQuery, useSidebarCollapsed } from './useShellState';

type Mode = 'expanded' | 'rail' | 'auto';

/**
 * Tablet/desktop sidebar (hidden on phones). Width and label visibility come from CSS via
 * data-mode (see RAIL), so the server-rendered markup is already correct for desktop.
 */
export function Sidebar({
  homeHref,
  nav,
  roleLabel,
  avatarUrl,
  top,
}: {
  homeHref: string;
  nav: DashboardNavGroup[];
  roleLabel?: string;
  avatarUrl?: string | null;
  top?: (opts: { rail: boolean }) => ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [tabletOpen, setTabletOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close the tablet overlay after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setTabletOpen(false);
    setHovered(false);
  }
  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );

  const mode: Mode =
    !isDesktop && (tabletOpen || hovered) ? 'expanded' : collapsed ? 'rail' : 'auto';
  const rail = mode === 'rail' || (mode === 'auto' && !isDesktop);

  const toggle = () => {
    if (isDesktop) {
      setCollapsed(!collapsed);
      return;
    }
    setHovered(false);
    setTabletOpen(!tabletOpen);
  };
  const onEnter = () => {
    if (isDesktop) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(true), 120);
  };
  const onLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(false);
  };

  return (
    <>
      {/* Reserves the sidebar's width in the page flow (the aside itself is fixed). */}
      <div
        aria-hidden
        className={cn(
          'hidden shrink-0 transition-[width] duration-150 ease-out motion-reduce:transition-none md:block',
          collapsed ? 'w-[72px]' : 'w-[72px] lg:w-[264px]',
        )}
      />
      {tabletOpen && !isDesktop && (
        <div
          className="fixed inset-0 z-30 hidden bg-slate-900/20 md:block lg:hidden"
          onClick={() => setTabletOpen(false)}
          aria-hidden
        />
      )}
      <aside
        data-mode={mode}
        data-testid="dashboard-sidebar"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className={cn(
          'group/sb fixed inset-y-0 start-0 z-40 hidden flex-col border-e border-sidebar-border bg-sidebar transition-[width,box-shadow] duration-150 ease-out motion-reduce:transition-none md:flex',
          mode === 'expanded'
            ? 'w-[264px] shadow-xl shadow-slate-900/10'
            : mode === 'rail'
              ? 'w-[72px]'
              : 'w-[72px] lg:w-[264px]',
        )}
      >
        <div className={cn('relative flex h-16 shrink-0 items-center px-4', RAIL.center)}>
          <Brand homeHref={homeHref} />
          <button
            type="button"
            onClick={toggle}
            aria-label={rail ? t('dashboard.sidebar.expand') : t('dashboard.sidebar.collapse')}
            aria-expanded={!rail}
            data-testid="sidebar-toggle"
            className="absolute -end-3.5 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-slate-600 shadow-sm transition-colors duration-150 outline-none after:absolute after:-inset-2 hover:bg-accent hover:text-primary focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            {/* Points toward the collapse side; mirrored in RTL, flipped when it would expand. */}
            <ChevronLeft
              className="size-4 transition-transform duration-150 group-data-[mode=rail]/sb:rotate-180 motion-reduce:transition-none max-lg:group-data-[mode=auto]/sb:rotate-180 rtl:-scale-x-100"
              aria-hidden
            />
          </button>
        </div>
        {top && <div className="shrink-0 px-3 pb-2">{top({ rail })}</div>}
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-2 [scrollbar-width:thin]">
          <NavGroups groups={nav} rail={rail} label={t('dashboard.sidebar.label')} />
        </div>
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <UserCard roleLabel={roleLabel} avatarUrl={avatarUrl} />
        </div>
      </aside>
    </>
  );
}
