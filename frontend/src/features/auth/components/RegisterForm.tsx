'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AuthShell } from './AuthShell';
import { FormAlert } from '@/components/shared/FormAlert';
import { Button } from '@/components/ui/button';
import { CheckboxField, Field } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/AuthProvider';
import { postLoginPath, safeNext } from '@/lib/auth/landing';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { registerSchema, type RegisterValues } from '@/lib/validation';
import { useI18n } from '@/i18n/provider';

const FIELDS = [
  'name',
  'email',
  'phone',
  'password',
  'password_confirmation',
  'accept_terms',
] as const;

export function RegisterForm({ accountType }: { accountType: 'patient' | 'doctor' }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const { register: registerUser } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(() => registerSchema(t), [t]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      password_confirmation: '',
      accept_terms: false,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await registerUser({
        ...values,
        phone: values.phone || undefined,
        account_type: accountType,
        locale,
        accept_terms: true,
      });
      toast.success(t('auth.welcome', { name: user.name }));
      router.replace(
        accountType === 'doctor'
          ? (next ?? '/dashboard/doctor/profile')
          : postLoginPath(user, next),
      );
    } catch (e) {
      if (!applyFieldErrors(e, setError, FIELDS)) setFormError(errorMessage(e, t));
    }
  });

  const isDoctor = accountType === 'doctor';

  return (
    <AuthShell
      title={isDoctor ? t('auth.doctorRegisterTitle') : t('auth.registerTitle')}
      subtitle={isDoctor ? t('auth.doctorRegisterSubtitle') : t('auth.registerSubtitle')}
      footer={
        <>
          <p>
            {t('auth.haveAccount')}{' '}
            <Link
              href={next ? `/auth/login?next=${encodeURIComponent(next)}` : '/auth/login'}
              className="font-medium text-primary hover:underline"
            >
              {t('nav.login')}
            </Link>
          </p>
          <p>
            {isDoctor ? t('auth.areYouPatient') : t('auth.areYouDoctor')}{' '}
            <Link
              href={isDoctor ? '/auth/register' : '/doctor/register'}
              className="font-medium text-primary hover:underline"
            >
              {isDoctor ? t('auth.joinAsPatient') : t('auth.joinAsDoctor')}
            </Link>
          </p>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {isDoctor && (
          <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
            {t('auth.doctorRegisterNote')}
          </p>
        )}
        <FormAlert message={formError} />
        <Field label={t('auth.name')} htmlFor="name" error={errors.name?.message} required>
          <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} />
        </Field>
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
          label={`${t('auth.phone')} (${t('common.optional')})`}
          htmlFor="phone"
          error={errors.phone?.message}
          hint={t('auth.phoneHint')}
        >
          <Input
            id="phone"
            type="tel"
            dir="ltr"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            {...register('phone')}
          />
        </Field>
        <Field
          label={t('auth.password')}
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
        <div>
          <CheckboxField
            id="accept_terms"
            label={
              <span>
                {t('auth.acceptTerms')} (
                <Link href="/terms" className="text-primary underline">
                  {t('footer.terms')}
                </Link>
                )
              </span>
            }
            {...register('accept_terms')}
          />
          {errors.accept_terms && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {errors.accept_terms.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('common.loading') : t('auth.registerButton')}
        </Button>
      </form>
    </AuthShell>
  );
}
