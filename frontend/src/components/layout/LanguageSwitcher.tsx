'use client';

import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';
import { useSwitchLanguage } from '@/lib/auth/useAccountActions';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t } = useI18n();
  const { next, switchLanguage } = useSwitchLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(className)}
      aria-label={`${t('nav.language')}: ${t('nav.switchTo')}`}
      lang={next}
      data-testid="language-switcher"
      onClick={switchLanguage}
    >
      <Languages aria-hidden />
      {t('nav.switchTo')}
    </Button>
  );
}
