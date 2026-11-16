'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Section } from '@/components/shared/states';
import { FormAlert } from '@/components/shared/FormAlert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { authApi } from '@/features/auth';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { passwordSchema } from '@/lib/validation';
import { useT } from '@/i18n/provider';

/** Change password (PUT /auth/password). */
export function PasswordForm() {
  const t = useT();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(
    () =>
      z
        .object({
          current_password: z.string().min(1, t('validation.required')),
          password: passwordSchema(t),
          password_confirmation: z.string().min(1, t('validation.required')),
        })
        .refine((d) => d.password === d.password_confirmation, {
          path: ['password_confirmation'],
          message: t('validation.passwordMatch'),
        }),
    [t],
  );
  const { register, handleSubmit, setError, reset, formState } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { message } = await authApi.updatePassword(values);
      toast.success(message || t('patient.passwordUpdated'));
      reset();
    } catch (e) {
      if (!applyFieldErrors(e, setError, ['current_password', 'password', 'password_confirmation']))
        setFormError(errorMessage(e, t));
    }
  });

  return (
    <Section title={t('patient.passwordSection')}>
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-3">
        <FormAlert message={formError} />
        <Field
          label={t('patient.currentPassword')}
          htmlFor="pw-current"
          error={formState.errors.current_password?.message}
          required
        >
          <Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            {...register('current_password')}
          />
        </Field>
        <Field
          label={t('patient.newPassword')}
          htmlFor="pw-new"
          error={formState.errors.password?.message}
          required
        >
          <Input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
        </Field>
        <Field
          label={t('auth.passwordConfirm')}
          htmlFor="pw-confirm"
          error={formState.errors.password_confirmation?.message}
          required
        >
          <Input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            {...register('password_confirmation')}
          />
        </Field>
        <div className="sm:col-span-3">
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Section>
  );
}
