'use client';

import Link from 'next/link';
import { useT } from '@/i18n/provider';
import { Logo } from './Header';

export default function Footer() {
  const t = useT();

  const columns = [
    {
      title: t('footer.quickLinks'),
      links: [
        { href: '/search', label: t('nav.doctors') },
        { href: '/specialties', label: t('nav.specialties') },
        { href: '/clinics', label: t('nav.clinics') },
        { href: '/urgent', label: t('nav.urgent') },
      ],
    },
    {
      title: t('footer.forDoctors'),
      links: [
        { href: '/auth/login?next=/dashboard', label: t('footer.doctorLogin') },
        { href: '/doctor/register', label: t('footer.joinAsDoctor') },
        { href: '/support', label: t('footer.contact') },
        { href: '/about', label: t('nav.about') },
      ],
    },
  ];

  return (
    <footer className="mt-auto border-t bg-card">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="space-y-4 md:col-span-2">
          <Logo />
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {t('footer.about')}
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="mb-3 text-sm font-semibold text-foreground">{col.title}</h2>
            <ul className="grid gap-1">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex min-h-10 items-center text-sm text-muted-foreground hover:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 text-sm text-muted-foreground md:flex-row">
          <p>
            {t('footer.rights', { year: new Date().getFullYear() })} — {t('common.appName')}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <Link href="/privacy" className="hover:text-primary">
              {t('footer.privacy')}
            </Link>
            <Link href="/terms" className="hover:text-primary">
              {t('footer.terms')}
            </Link>
            <Link href="/support" className="hover:text-primary">
              {t('footer.contact')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
