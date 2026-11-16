'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { useLayoutSlots } from '@/components/layout/LayoutSlots';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { DashboardNavItem } from './nav-types';

const iconBtn =
  'flex size-11 shrink-0 items-center justify-center rounded-lg text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring md:hidden';
const crumbCls = (here: boolean) =>
  cn(
    'truncate rounded-md px-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
    here ? 'font-semibold text-foreground' : 'text-muted-foreground',
  );

/**
 * Sticky bar above the content. Phones: menu button, back (on detail pages) and the page title.
 * Tablet/desktop: Area › Section breadcrumbs. Always: notifications.
 */
export function TopBar({
  title,
  homeHref,
  current,
  menuOpen,
  onMenu,
}: {
  title: string;
  homeHref: string;
  current?: DashboardNavItem;
  menuOpen: boolean;
  onMenu: () => void;
}) {
  const { t } = useI18n();
  const slots = useLayoutSlots();
  const { user } = useAuth();
  const pathname = usePathname();
  // Detail pages (e.g. …/appointments/{id}) get a back button on phones.
  const parentHref = current
    ? pathname !== current.href
      ? current.href
      : null
    : pathname !== homeHref && pathname.startsWith(`${homeHref}/`)
      ? homeHref
      : null;

  return (
    <header className="sticky top-0 z-20 border-b bg-card/90 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-1 px-2 sm:px-4 md:h-16 md:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          aria-label={t('nav.menu')}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          data-testid="dashboard-menu-button"
          className={iconBtn}
        >
          <Menu className="size-5" aria-hidden />
        </button>
        {parentHref && (
          <Link href={parentHref} aria-label={t('common.back')} className={iconBtn}>
            <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden />
          </Link>
        )}
        <div className="min-w-0 flex-1 md:hidden">
          <p className="truncate text-[15px] font-semibold text-foreground">
            {current?.label ?? title}
          </p>
          {current && <p className="-mt-0.5 truncate text-xs text-muted-foreground">{title}</p>}
        </div>

        <nav aria-label={t('dashboard.breadcrumb')} className="hidden min-w-0 flex-1 md:block">
          <ol className="flex min-w-0 items-center gap-1.5 text-sm">
            <li className="min-w-0">
              <Link
                href={homeHref}
                aria-current={pathname === homeHref ? 'page' : undefined}
                className={crumbCls(pathname === homeHref)}
              >
                {title}
              </Link>
            </li>
            {current && current.href !== homeHref && (
              <li className="flex min-w-0 items-center gap-1.5">
                <ChevronRight
                  className="size-4 shrink-0 text-slate-400 rtl:rotate-180"
                  aria-hidden
                />
                <Link
                  href={current.href}
                  aria-current={pathname === current.href ? 'page' : undefined}
                  className={crumbCls(pathname === current.href)}
                >
                  {current.label}
                </Link>
              </li>
            )}
          </ol>
        </nav>
        {user && slots.notifications}
      </div>
    </header>
  );
}
