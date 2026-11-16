'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { CurrentUser } from '@/types/api';
import type { PatientProfile } from '../../types';
import { ErrorState, LoadingState, Section } from '@/components/shared/states';
import { PageHeader } from '@/components/shared/PageHeader';
import { PasswordForm } from '../PasswordForm';
import { Consents } from '../Consents';
import { patientApi } from '../../api';
import { patientKeys } from '../../hooks/keys';
import { FormAlert } from '@/components/shared/FormAlert';
import { Button } from '@/components/ui/button';
import { Field, NativeSelect } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { sessionApi } from '@/lib/auth/api';
import { useCities, useGovernorates } from '@/features/directory';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { useAuth, ME_QUERY_KEY } from '@/lib/auth/AuthProvider';
import { EGYPT_PHONE } from '@/lib/validation';
import { useFormat, useI18n, useT } from '@/i18n/provider';

export function PatientProfileScreen() {
  const t = useT();
  const { user } = useAuth();
  const profile = useQuery({ queryKey: patientKeys.profile, queryFn: patientApi.profile });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('patient.profileTitle')}
        description={t('patientPanel.profile.subtitle')}
      />
      {user && <AccountForm user={user} />}
      <Section
        title={t('patient.medicalSection')}
        description={t('patientPanel.profile.personalHint')}
      >
        {profile.isPending ? (
          <LoadingState />
        ) : profile.isError ? (
          <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
        ) : (
          <PersonalForm profile={profile.data} />
        )}
      </Section>
      <PasswordForm />
      <Consents />
    </div>
  );
}

function AccountForm({ user }: { user: CurrentUser }) {
  const { t, locale, setLocale } = useI18n();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(3, t('validation.nameMin')).max(120),
        phone: z
          .string()
          .trim()
          .refine((v) => v === '' || EGYPT_PHONE.test(v), t('validation.phone')),
        locale: z.enum(['ar', 'en']),
      }),
    [t],
  );
  const { register, handleSubmit, setError, formState } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name, phone: user.phone ?? '', locale: user.locale ?? locale },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { data, message } = await sessionApi.updateMe({
        name: values.name,
        phone: values.phone || null,
        locale: values.locale,
      });
      queryClient.setQueryData(ME_QUERY_KEY, data);
      toast.success(message || t('common.saved'));
      if (values.locale !== locale) setLocale(values.locale);
    } catch (e) {
      if (!applyFieldErrors(e, setError, ['name', 'phone', 'locale']))
        setFormError(errorMessage(e, t));
    }
  });

  return (
    <Section
      title={t('patient.accountSection')}
      description={t('patientPanel.profile.accountHint')}
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormAlert message={formError} />
        <Field
          label={t('auth.name')}
          htmlFor="acc-name"
          error={formState.errors.name?.message}
          required
        >
          <Input id="acc-name" {...register('name')} aria-invalid={!!formState.errors.name} />
        </Field>
        <Field label={t('auth.email')} htmlFor="acc-email">
          <Input id="acc-email" value={user.email} dir="ltr" disabled readOnly />
        </Field>
        <Field
          label={t('auth.phone')}
          htmlFor="acc-phone"
          error={formState.errors.phone?.message}
          hint={t('auth.phoneHint')}
        >
          <Input
            id="acc-phone"
            dir="ltr"
            type="tel"
            {...register('phone')}
            aria-invalid={!!formState.errors.phone}
          />
        </Field>
        <Field label={t('patient.language')} htmlFor="acc-locale">
          <NativeSelect id="acc-locale" {...register('locale')}>
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </NativeSelect>
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Section>
  );
}

function PersonalForm({ profile }: { profile: PatientProfile }) {
  const t = useT();
  const f = useFormat();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, control, setValue, setError, formState } = useForm({
    defaultValues: {
      date_of_birth: profile.date_of_birth ?? '',
      gender: profile.gender ?? '',
      governorate_id: profile.governorate_id ?? '',
      city_id: profile.city_id ?? '',
    },
  });
  const governorateId = useWatch({ control, name: 'governorate_id' });
  const governorates = useGovernorates();
  const cities = useCities(governorateId);

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      const { data, message } = await patientApi.updateProfile({
        date_of_birth: v.date_of_birth || null,
        gender: (v.gender || null) as PatientProfile['gender'],
        governorate_id: v.governorate_id || null,
        city_id: v.city_id || null,
      });
      queryClient.setQueryData(patientKeys.profile, data);
      toast.success(message || t('common.saved'));
    } catch (e) {
      if (!applyFieldErrors(e, setError, ['date_of_birth', 'gender', 'governorate_id', 'city_id']))
        setFormError(errorMessage(e, t));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <FormAlert message={formError} />
      <Field
        label={t('patient.dateOfBirth')}
        htmlFor="p-dob"
        error={formState.errors.date_of_birth?.message}
      >
        <Input id="p-dob" type="date" {...register('date_of_birth')} />
      </Field>
      <Field
        label={t('patient.gender')}
        htmlFor="p-gender"
        error={formState.errors.gender?.message}
      >
        <NativeSelect id="p-gender" {...register('gender')}>
          <option value="">{t('patient.notSpecified')}</option>
          <option value="male">{t('patient.male')}</option>
          <option value="female">{t('patient.female')}</option>
        </NativeSelect>
      </Field>
      <Field
        label={t('patient.governorate')}
        htmlFor="p-gov"
        error={formState.errors.governorate_id?.message}
      >
        <NativeSelect
          id="p-gov"
          {...register('governorate_id', { onChange: () => setValue('city_id', '') })}
        >
          <option value="">{t('patient.notSpecified')}</option>
          {governorates.data?.map((g) => (
            <option key={g.id} value={g.id}>
              {f.l(g)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t('patient.city')} htmlFor="p-city" error={formState.errors.city_id?.message}>
        <NativeSelect id="p-city" disabled={!governorateId} {...register('city_id')}>
          <option value="">{t('patient.notSpecified')}</option>
          {cities.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {f.l(c)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </form>
  );
}
