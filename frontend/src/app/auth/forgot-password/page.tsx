'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthShell, authApi } from '@/features/auth';
import { FormAlert } from '@/components/shared/FormAlert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { emailSchema } from '@/lib/validation';
import { useT } from '@/i18n/provider';

export default function ForgotPasswordPage() {
  const t = useT();
  const [error, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const schema = useMemo(() => z.object({ email: emailSchema(t) }), [t]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      const res = await authApi.forgot(email);
      setSent(res.message || t('auth.linkSent'));
    } catch (e) {
      if (!applyFieldErrors(e, setError, ['email'])) setFormError(errorMessage(e, t));
    }
  });

  return (
    <AuthShell
      title={t('auth.forgotTitle')}
      subtitle={t('auth.forgotSubtitle')}
      footer={
        <Link href="/auth/login" className="font-medium text-primary hover:underline">
          {t('auth.backToLogin')}
        </Link>
      }
    >
      {sent ? (
        <FormAlert tone="success" message={sent} />
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormAlert message={error} />
          <Field label={t('auth.email')} htmlFor="email" error={errors.email?.message} required>
            <Input
              id="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t('common.loading') : t('auth.sendLink')}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
