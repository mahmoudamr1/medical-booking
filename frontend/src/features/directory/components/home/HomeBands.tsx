'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { Band } from '../Band';

export { FeaturedClinics } from './FeaturedClinics';

export function JoinCta() {
  const t = useT();
  return (
    <Band className="border-t bg-muted/40">
      <div className="mx-auto max-w-3xl space-y-6 text-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t('home.ctaTitle')}
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">
            {t('home.ctaBody')}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/auth/register"
            className={buttonVariants({ size: 'lg' })}
          >
            {t('home.ctaRegister')}
          </Link>
          <Link
            href="/doctor/register"
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            {t('home.ctaDoctor')}
          </Link>
        </div>
      </div>
    </Band>
  );
}
