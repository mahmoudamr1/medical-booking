'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth, dashboardLinks } from '@/lib/auth/AuthProvider';
import { useLogout } from '@/lib/auth/useAccountActions';
import { useI18n } from '@/i18n/provider';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';
import { useLayoutSlots } from './LayoutSlots';
import { cn } from '@/lib/utils';
import { PersonAvatar } from '@/components/shared/PersonAvatar';

export function Logo() {
  const { t } = useI18n();
  return (
    <Link
      href="/"
      className="flex min-h-11 items-center gap-2.5 rounded-lg"
      aria-label={t('common.appName')}
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <HeartPulse className="size-5" aria-hidden />
      </span>
      <span className="text-base font-semibold text-foreground sm:text-lg">
        {t('common.appName')}
      </span>
    </Link>
  );
}

export default function Header() {
  const { t } = useI18n();
  const slots = useLayoutSlots();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const logout = useLogout();
  const links = dashboardLinks(user);

  const nav = [
    { href: '/search', label: t('nav.doctors') },
    { href: '/specialties', label: t('nav.specialties') },
    { href: '/clinics', label: t('nav.clinics') },
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label={t('nav.menu')}>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground',
                  isActive(item.href) ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 lg:inline-flex"
          >
            <Link href="/urgent">
              <Stethoscope aria-hidden />
              {t('nav.urgent')}
            </Link>
          </Button>
          <LanguageSwitcher className="hidden lg:inline-flex" />

          {isLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" aria-hidden />
          ) : user ? (
            <>
              {slots.notifications}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden gap-2 px-2 lg:inline-flex"
                    aria-label={t('nav.myAccount')}
                  >
                    <PersonAvatar name={user.name} className="size-7" />
                    <span className="max-w-[9rem] truncate">{user.name}</span>
                    <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-60">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {links.map((l) => (
                    <DropdownMenuItem key={l.href} asChild>
                      <Link href={l.href}>
                        <LayoutDashboard aria-hidden />
                        {t(`nav.${l.key}`)}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/patient/profile">
                      <UserRound aria-hidden />
                      {t('nav.myAccount')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={logout}>
                    <LogOut className="rtl:rotate-180" aria-hidden />
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/login">{t('nav.login')}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/register">{t('nav.register')}</Link>
              </Button>
            </div>
          )}

          <MobileMenu nav={nav} isActive={isActive} />
        </div>
      </div>
    </header>
  );
}
