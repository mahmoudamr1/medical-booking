import type { LucideIcon } from 'lucide-react';

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match only the exact path (for section roots). */
  exact?: boolean;
  /** Count badge (hidden when 0) or a dot for "needs attention". */
  badge?: number | 'dot';
  badgeTone?: 'primary' | 'warning' | 'danger';
  /** Shown in the phone bottom tab bar (keep to 4 per area). */
  tab?: boolean;
}

export interface DashboardNavGroup {
  /** Small uppercase group label; omit for the first, untitled group. */
  label?: string;
  items: DashboardNavItem[];
}

function isNavActive(pathname: string, item: Pick<DashboardNavItem, 'href' | 'exact'>): boolean {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** The most specific nav item matching the path (longest href wins). */
export function activeNavItem(
  pathname: string,
  groups: DashboardNavGroup[],
): DashboardNavItem | undefined {
  let best: DashboardNavItem | undefined;
  for (const g of groups) {
    for (const item of g.items) {
      if (isNavActive(pathname, item) && (!best || item.href.length > best.href.length))
        best = item;
    }
  }
  return best;
}

/** Sidebar badge counts may be up to a minute old (they reuse page queries when possible). */
export const NAV_BADGE_STALE_MS = 60_000;
