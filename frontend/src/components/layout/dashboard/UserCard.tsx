'use client';

import Link from 'next/link';
import {
  ChevronsUpDown,
  HeartPulse,
  Languages,
  LayoutDashboard,
  LogOut,
  UserRound,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useLogout, useSwitchLanguage } from '@/lib/auth/useAccountActions';
import { dashboardLinks, useAuth } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { PersonAvatar } from '@/components/shared/PersonAvatar';
import { RAIL } from './SidebarParts';

/** Avatar, name and role with an account menu; language switch and logout. */
export function UserCard({
  roleLabel,
  avatarUrl,
  onNavigate,
}: {
  roleLabel?: string;
  avatarUrl?: string | null;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { next, switchLanguage } = useSwitchLanguage();
  const logout = useLogout();

  if (!user) {
    return (
      <div className={cn('flex items-center gap-3 p-2', RAIL.center)} aria-hidden>
        <Skeleton className="size-9 rounded-full" />
        <div className={cn('flex-1 space-y-1.5', RAIL.hide)}>
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  const onLogout = async () => {
    onNavigate?.();
    await logout();
  };
  const links = dashboardLinks(user);

  return (
    <div className="space-y-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            'flex min-h-12 w-full items-center gap-3 rounded-xl p-2 text-start transition-colors duration-150 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-sidebar-accent motion-reduce:transition-none',
            RAIL.center,
          )}
          aria-label={`${t('dashboard.sidebar.accountMenu')}: ${user.name}`}
        >
          <PersonAvatar name={user.name} src={avatarUrl} />
          <span className={cn('min-w-0 flex-1', RAIL.hide)}>
            <span className="block truncate text-sm font-semibold text-foreground">
              {user.name}
            </span>
            {roleLabel && (
              <span className="block truncate text-xs text-muted-foreground">{roleLabel}</span>
            )}
          </span>
          <ChevronsUpDown
            className={cn('size-4 shrink-0 text-muted-foreground', RAIL.hide)}
            aria-hidden
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground" dir="ltr">
              {user.email}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {links.length > 1 && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t('dashboard.sidebar.switchDashboard')}
              </DropdownMenuLabel>
              {links.map((l) => (
                <DropdownMenuItem key={l.href} asChild className="min-h-10">
                  <Link href={l.href} onClick={onNavigate}>
                    <LayoutDashboard aria-hidden />
                    {t(`nav.${l.key}`)}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem asChild className="min-h-10">
            <Link href="/dashboard/patient/profile" onClick={onNavigate}>
              <UserRound aria-hidden />
              {t('nav.myAccount')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="min-h-10">
            <Link href="/" onClick={onNavigate}>
              <HeartPulse aria-hidden />
              {t('dashboard.sidebar.backToSite')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-10" onSelect={switchLanguage} lang={next}>
            <Languages aria-hidden />
            {t('nav.switchTo')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" className="min-h-10" onSelect={onLogout}>
            <LogOut className="rtl:rotate-180" aria-hidden />
            {t('nav.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className={cn('flex items-center gap-1', RAIL.hide)}>
        <button
          type="button"
          onClick={switchLanguage}
          lang={next}
          data-testid="language-switcher"
          aria-label={`${t('nav.language')}: ${t('nav.switchTo')}`}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-medium text-slate-600 transition-colors duration-150 outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <Languages className="size-4" aria-hidden />
          {t('nav.switchTo')}
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-medium text-red-700 transition-colors duration-150 outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <LogOut className="size-4 rtl:rotate-180" aria-hidden />
          {t('nav.logout')}
        </button>
      </div>
    </div>
  );
}
