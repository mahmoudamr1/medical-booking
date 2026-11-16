'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AuthShell } from './AuthShell';
import { FormAlert } from '@/components/shared/FormAlert';
import { Button } from '@/components/ui/button';
import { CheckboxField, Field } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/shared/states';
import { useAuth, homeFor, safeNext } from '@/lib/auth/AuthProvider';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { emailSchema } from '@/lib/validation';
import { useT } from '@/i18n/provider';

export function LoginScreen() {
  return (
    <Suspense fallback={<LoadingState className="py-24" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const { user, login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: emailSchema(t),
        password: z.string().min(1, t('validation.required')),
        remember: z.boolean(),
      }),
    [t],
  );
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: false },
  });

  // Already signed in (e.g. opened /auth/login directly): go where they were heading.
  useEffect(() => {
    if (user && !isSubmitting && !isSubmitSuccessful) router.replace(next ?? homeFor(user));
  }, [user, isSubmitting, isSubmitSuccessful, next, router]);

  const onSubmit = handleSubmit(async ({ email, password, remember }) => {
    setFormError(null);
    try {
      const me = await login(email, password, remember);
      toast.success(t('auth.welcome', { name: me.name }));
      router.replace(next ?? homeFor(me));
    } catch (e) {
      if (!applyFieldErrors(e, setError, ['email', 'password'])) setFormError(errorMessage(e, t));
      throw e; // keep isSubmitSuccessful false
    }
  });

  return (
    <AuthShell
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <>
          <p>
            {t('auth.noAccount')}{' '}
            <Link
              href={next ? `/auth/register?next=${encodeURIComponent(next)}` : '/auth/register'}
              className="font-medium text-primary hover:underline"
            >
              {t('nav.register')}
            </Link>
          </p>
          <p>
            {t('auth.areYouDoctor')}{' '}
            <Link href="/doctor/register" className="font-medium text-primary hover:underline">
              {t('auth.joinAsDoctor')}
            </Link>
          </p>
        </>
      }
    >
      <form onSubmit={(e) => onSubmit(e).catch(() => undefined)} noValidate className="space-y-4">
        <FormAlert message={formError} />
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
        <Field
          label={t('auth.password')}
          htmlFor="password"
          error={errors.password?.message}
          required
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
        </Field>
        <div className="flex items-center justify-between">
          <CheckboxField id="remember" label={t('auth.remember')} {...register('remember')} />
          <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
            {t('auth.forgot')}
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('common.loading') : t('auth.loginButton')}
        </Button>
      </form>
    </AuthShell>
  );
}
