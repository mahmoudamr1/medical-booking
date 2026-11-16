'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LayoutDashboard, LogOut, Menu, Stethoscope, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/i18n/provider';
import { dashboardLinks, useAuth } from '@/lib/auth/AuthProvider';
import { useLogout } from '@/lib/auth/useAccountActions';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from './LanguageSwitcher';

/** Phone/tablet navigation drawer of the public site header. */
export function MobileMenu({
  nav,
  isActive,
}: {
  nav: { href: string; label: string }[];
  isActive: (href: string) => boolean;
}) {
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const links = dashboardLinks(user);
  const onLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('nav.menu')}>
          <Menu aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side={dir === 'rtl' ? 'right' : 'left'} className="w-80 max-w-[85vw] gap-0 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="text-start">{t('common.appName')}</SheetTitle>
        </SheetHeader>
        <nav className="grid gap-1 p-3" aria-label={t('nav.menu')} onClick={() => setOpen(false)}>
          {[{ href: '/', label: t('nav.home') }, ...nav].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted',
                isActive(item.href) && item.href !== '/' ? 'text-primary' : 'text-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/urgent"
            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
          >
            <Stethoscope className="size-4" aria-hidden />
            {t('nav.urgent')}
          </Link>
        </nav>
        <Separator />
        <div className="grid gap-1 p-3">
          {user ? (
            <>
              <p className="px-3 pb-1 text-xs text-muted-foreground">{user.email}</p>
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted"
                >
                  <LayoutDashboard className="size-4 text-muted-foreground" aria-hidden />
                  {t(`nav.${l.key}`)}
                </Link>
              ))}
              <Link
                href="/dashboard/patient/profile"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted"
              >
                <UserRound className="size-4 text-muted-foreground" aria-hidden />
                {t('nav.myAccount')}
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-start text-sm text-destructive hover:bg-red-50"
              >
                <LogOut className="size-4 rtl:rotate-180" aria-hidden />
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <div className="grid gap-2">
              <Button asChild variant="outline">
                <Link href="/auth/login" onClick={() => setOpen(false)}>
                  {t('nav.login')}
                </Link>
              </Button>
              <Button asChild>
                <Link href="/auth/register" onClick={() => setOpen(false)}>
                  {t('nav.register')}
                </Link>
              </Button>
            </div>
          )}
        </div>
        <Separator />
        <div className="p-3">
          <LanguageSwitcher className="w-full justify-start" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
