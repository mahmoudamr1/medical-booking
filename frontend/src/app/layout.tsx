import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { getServerLocale } from '@/i18n/server';
import { dirFor } from '@/i18n/config';
import { createT } from '@/i18n/translate';

// One family for Arabic and Latin; system fonts are the fallback stack in globals.css.
const plex = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const t = createT(await getServerLocale());
  return {
    title: { default: t('common.appName'), template: `%s · ${t('common.appName')}` },
    description: t('home.heroSubtitle'),
  };
}

export const viewport: Viewport = {
  themeColor: '#0f766e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} dir={dirFor(locale)} className={plex.variable}>
      <body className="min-h-screen font-sans">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
