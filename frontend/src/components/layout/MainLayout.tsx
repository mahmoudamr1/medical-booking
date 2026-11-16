'use client';

import type { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import { useT } from '@/i18n/provider';

export default function MainLayout({
  children,
  showHeader = true,
  showFooter = true,
}: {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
}) {
  const t = useT();
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2"
      >
        {t('common.skipToContent')}
      </a>
      {showHeader && <Header />}
      <main id="main" className="flex-1">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
