'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthShell } from './AuthShell';
import { authApi } from '../api';
import { FormAlert } from '@/components/shared/FormAlert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/shared/states';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { passwordSchema } from '@/lib/validation';
import { useT } from '@/i18n/provider';

export function ResetPasswordScreen() {
  return (
    <Suspense fallback={<LoadingState className="py-24" />}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const t = useT();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';
  const [error, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const schema = useMemo(
    () =>
      z
        .object({
          password: passwordSchema(t),
          password_confirmation: z.string().min(1, t('validation.required')),
        })
        .refine((d) => d.password === d.password_confirmation, {
          path: ['password_confirmation'],
          message: t('validation.passwordMatch'),
        }),
    [t],
  );
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', password_confirmation: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await authApi.reset({ token, email, ...values });
      setDone(true);
    } catch (e) {
      if (!applyFieldErrors(e, setError, ['password', 'password_confirmation']))
        setFormError(errorMessage(e, t));
    }
  });

  return (
    <AuthShell
      title={t('auth.resetTitle')}
      footer={
        <Link href="/auth/login" className="font-medium text-primary hover:underline">
          {t('auth.backToLogin')}
        </Link>
      }
    >
      {!token || !email ? (
        <FormAlert message={t('auth.resetInvalidLink')} />
      ) : done ? (
        <div className="space-y-4 text-center">
          <FormAlert tone="success" message={t('auth.resetDone')} />
          <Link href="/auth/login" className={buttonVariants()}>
            {t('nav.login')}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormAlert message={error} />
          <p className="text-center text-sm text-muted-foreground" dir="ltr">
            {email}
          </p>
          <Field
            label={t('patient.newPassword')}
            htmlFor="password"
            error={errors.password?.message}
            hint={t('validation.password')}
            required
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
          </Field>
          <Field
            label={t('auth.passwordConfirm')}
            htmlFor="password_confirmation"
            error={errors.password_confirmation?.message}
            required
          >
            <Input
              id="password_confirmation"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password_confirmation}
              {...register('password_confirmation')}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t('common.loading') : t('auth.resetButton')}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
