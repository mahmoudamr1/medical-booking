'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useT } from '@/i18n/provider';

export function PolicyPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const t = useT();
  return (
    <MainLayout>
      <div className="container-page max-w-3xl py-12">
        <h1 className="mb-6 text-3xl font-bold text-foreground">
          {t(kind === 'privacy' ? 'policies.privacyTitle' : 'policies.termsTitle')}
        </h1>
        <p className="text-lg leading-loose text-foreground">
          {t(kind === 'privacy' ? 'policies.privacyBody' : 'policies.termsBody')}
        </p>
      </div>
    </MainLayout>
  );
}
