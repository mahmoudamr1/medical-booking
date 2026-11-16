'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ClinicDetailsPayload, ClinicManage } from '../types';
import { FormAlert } from '@/components/shared/FormAlert';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { useT } from '@/i18n/provider';

const FIELDS = [
  'name_ar',
  'name_en',
  'description_ar',
  'description_en',
  'phone',
  'email',
] as const;
const PHONE = /^\+?[0-9]{7,15}$/; // ClinicDetailsRequest

/** Organization details form (POST /clinics and PUT /clinics/{clinic}/manage share the same rules). */
export function ClinicDetailsForm({
  clinic,
  readOnly = false,
  submitLabel,
  onSubmit,
  footer,
}: {
  clinic?: ClinicManage | null;
  readOnly?: boolean;
  submitLabel?: string;
  onSubmit: (values: ClinicDetailsPayload & { name_ar: string }) => Promise<unknown>;
  footer?: ReactNode;
}) {
  const t = useT();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => {
    const optional = (max: number) => z.string().trim().max(max, t('validation.max'));
    return z.object({
      name_ar: z.string().trim().min(2, t('validation.required')).max(150, t('validation.max')),
      name_en: optional(150).refine((v) => v === '' || v.length >= 2, t('validation.min')),
      description_ar: optional(2000),
      description_en: optional(2000),
      phone: z
        .string()
        .trim()
        .refine((v) => v === '' || PHONE.test(v), t('validation.phone')),
      email: z
        .string()
        .trim()
        .max(191)
        .refine((v) => v === '' || z.string().email().safeParse(v).success, t('validation.email')),
    });
  }, [t]);
  type Values = z.infer<typeof schema>;

  const { register, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name_ar: clinic?.name_ar ?? '',
      name_en: clinic?.name_en ?? '',
      description_ar: clinic?.description_ar ?? '',
      description_en: clinic?.description_en ?? '',
      phone: clinic?.phone ?? '',
      email: clinic?.email ?? '',
    },
  });
  const err = formState.errors;

  const submit = handleSubmit(async (v) => {
    setFormError(null);
    const empty = (s: string) => (s === '' ? null : s);
    try {
      await onSubmit({
        name_ar: v.name_ar,
        // clinics.name_en is NOT NULL in the DB although the request rule is nullable: omit when blank.
        name_en: v.name_en === '' ? undefined : v.name_en,
        description_ar: empty(v.description_ar),
        description_en: empty(v.description_en),
        phone: empty(v.phone),
        email: empty(v.email),
      });
    } catch (e) {
      if (!applyFieldErrors(e, setError, FIELDS)) setFormError(errorMessage(e, t));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <fieldset disabled={readOnly || formState.isSubmitting} className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('clinic.settings.nameAr')}
          htmlFor="c-name-ar"
          error={err.name_ar?.message}
          required
        >
          <Input
            id="c-name-ar"
            dir="rtl"
            maxLength={150}
            aria-invalid={!!err.name_ar}
            {...register('name_ar')}
          />
        </Field>
        <Field label={t('clinic.settings.nameEn')} htmlFor="c-name-en" error={err.name_en?.message}>
          <Input
            id="c-name-en"
            dir="ltr"
            maxLength={150}
            aria-invalid={!!err.name_en}
            {...register('name_en')}
          />
        </Field>
        <Field
          label={t('clinic.settings.descriptionAr')}
          htmlFor="c-desc-ar"
          error={err.description_ar?.message}
          className="sm:col-span-2"
        >
          <Textarea
            id="c-desc-ar"
            dir="rtl"
            rows={3}
            maxLength={2000}
            aria-invalid={!!err.description_ar}
            {...register('description_ar')}
          />
        </Field>
        <Field
          label={t('clinic.settings.descriptionEn')}
          htmlFor="c-desc-en"
          error={err.description_en?.message}
          className="sm:col-span-2"
        >
          <Textarea
            id="c-desc-en"
            dir="ltr"
            rows={3}
            maxLength={2000}
            aria-invalid={!!err.description_en}
            {...register('description_en')}
          />
        </Field>
        <Field label={t('clinic.settings.phone')} htmlFor="c-phone" error={err.phone?.message}>
          <Input
            id="c-phone"
            type="tel"
            dir="ltr"
            inputMode="tel"
            aria-invalid={!!err.phone}
            {...register('phone')}
          />
        </Field>
        <Field label={t('clinic.settings.email')} htmlFor="c-email" error={err.email?.message}>
          <Input
            id="c-email"
            type="email"
            dir="ltr"
            aria-invalid={!!err.email}
            {...register('email')}
          />
        </Field>
      </fieldset>
      {!readOnly && (
        <div className="flex flex-wrap justify-end gap-2">
          {footer}
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? t('common.saving') : (submitLabel ?? t('common.save'))}
          </Button>
        </div>
      )}
    </form>
  );
}
