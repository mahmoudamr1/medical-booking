'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useT } from '@/i18n/provider';
import type { TranslationKey } from '@/i18n/translate';

const FAQ = [1, 2, 3, 4] as const;

export default function SupportPage() {
  const t = useT();

  return (
    <MainLayout>
      <div className="bg-muted/50 py-12">
        <div className="container-page max-w-4xl space-y-8">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground">{t('info.supportTitle')}</h1>
            <p className="text-lg text-muted-foreground">{t('info.supportIntro')}</p>
          </div>
          <section>
            <h2 className="mb-6 text-2xl font-bold text-foreground">{t('info.faqTitle')}</h2>
            <div className="space-y-4">
              {FAQ.map((n) => (
                <details key={n} className="group rounded-xl border bg-card p-5">
                  <summary className="cursor-pointer font-semibold text-foreground">
                    {t(`info.q${n}` as TranslationKey)}
                  </summary>
                  <p className="mt-3 text-muted-foreground">{t(`info.a${n}` as TranslationKey)}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
