'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { activeNavItem, type DashboardNavGroup } from './nav-types';
import { BottomTabBar, MobileNavSheet } from './MobileNav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface DashboardShellProps {
  /** Area name ("Admin dashboard"), used as the breadcrumb root and the sheet title. */
  title: string;
  /** Root of the area; the brand and the first breadcrumb link here. */
  homeHref: string;
  nav: DashboardNavGroup[];
  /** Role shown under the user's name. */
  roleLabel?: string;
  avatarUrl?: string | null;
  /** Rendered at the top of the sidebar (e.g. the clinic switcher); receives the rail flag. */
  sidebarTop?: (opts: { rail: boolean }) => ReactNode;
  children: ReactNode;
}

/**
 * Shared dashboard frame for the patient, doctor, clinic and admin areas.
 *  ≥1024px   sticky full-height sidebar (264px), collapsible to a 72px icon rail (remembered)
 *  768–1023  icon rail; expands over the content on hover or with the toggle
 *  <768px    top app bar with a menu sheet, plus a bottom tab bar for the main items
 * The sidebar sits on the inline-start side, so it is on the right in Arabic (RTL).
 */
export function DashboardShell({
  title,
  homeHref,
  nav,
  roleLabel,
  avatarUrl,
  sidebarTop,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Close the phone sheet after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setSheetOpen(false);
  }

  const current = activeNavItem(pathname, nav);
  const items = nav.flatMap((g) => g.items);
  const tabs = items.filter((i) => i.tab).slice(0, 4);

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar
        homeHref={homeHref}
        nav={nav}
        roleLabel={roleLabel}
        avatarUrl={avatarUrl}
        top={sidebarTop}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={title}
          homeHref={homeHref}
          current={current}
          menuOpen={sheetOpen}
          onMenu={() => setSheetOpen(true)}
        />
        <main
          id="main"
          tabIndex={-1}
          className={cn(
            'mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-5 outline-none sm:px-6 md:py-6 lg:px-8 lg:py-8',
            tabs.length > 0 && 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8',
          )}
        >
          {children}
        </main>
      </div>

      <MobileNavSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={title}
        homeHref={homeHref}
        nav={nav}
        top={sidebarTop?.({ rail: false })}
        roleLabel={roleLabel}
        avatarUrl={avatarUrl}
      />
      {tabs.length > 0 && (
        <BottomTabBar
          tabs={tabs}
          current={current}
          hasMore={items.length > tabs.length}
          onMore={() => setSheetOpen(true)}
        />
      )}
    </div>
  );
}
