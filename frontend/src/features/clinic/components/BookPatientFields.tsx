'use client';

import { useMemo } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { z } from 'zod';
import { Field, Textarea } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useT } from '@/i18n/provider';
import { EGYPT_PHONE } from '@/lib/validation';

export const PATIENT_FIELDS = ['patient_email', 'patient_name', 'patient_phone', 'notes'] as const;

/** Patient details for a reception booking (existing account by email, or a new patient). */
export function usePatientSchema() {
  const t = useT();
  return useMemo(
    () =>
      z.object({
        patient_email: z
          .string()
          .trim()
          .min(1, t('validation.required'))
          .email(t('validation.email')),
        patient_name: z
          .string()
          .trim()
          .max(120, t('validation.max'))
          .refine((v) => v === '' || v.length >= 3, t('validation.nameMin')),
        patient_phone: z
          .string()
          .trim()
          .refine((v) => v === '' || EGYPT_PHONE.test(v), t('validation.phone')),
        notes: z.string().trim().max(500, t('validation.max')),
      }),
    [t],
  );
}

export type PatientValues = z.infer<ReturnType<typeof usePatientSchema>>;

export function PatientFields({
  register,
  errors,
}: {
  register: UseFormRegister<PatientValues>;
  errors: FieldErrors<PatientValues>;
}) {
  const t = useT();
  return (
    <fieldset className="space-y-4 border-t pt-4">
      <legend className="sr-only">{t('clinic.book.patientTitle')}</legend>
      <p className="text-sm font-medium text-foreground" aria-hidden>
        {t('clinic.book.patientTitle')}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('clinic.book.patientEmail')}
          htmlFor="b-email"
          required
          error={errors.patient_email?.message}
          hint={t('clinic.book.patientEmailHint')}
          className="sm:col-span-2"
        >
          <Input
            id="b-email"
            type="email"
            dir="ltr"
            autoComplete="off"
            aria-invalid={!!errors.patient_email}
            {...register('patient_email')}
          />
        </Field>
        <Field
          label={t('clinic.book.patientName')}
          htmlFor="b-name"
          error={errors.patient_name?.message}
          hint={t('clinic.book.patientNameHint')}
        >
          <Input
            id="b-name"
            autoComplete="off"
            maxLength={120}
            aria-invalid={!!errors.patient_name}
            {...register('patient_name')}
          />
        </Field>
        <Field
          label={t('clinic.book.patientPhone')}
          htmlFor="b-phone"
          error={errors.patient_phone?.message}
        >
          <Input
            id="b-phone"
            type="tel"
            dir="ltr"
            inputMode="tel"
            autoComplete="off"
            aria-invalid={!!errors.patient_phone}
            {...register('patient_phone')}
          />
        </Field>
        <Field
          label={t('clinic.book.notes')}
          htmlFor="b-notes"
          error={errors.notes?.message}
          className="sm:col-span-2"
        >
          <Textarea
            id="b-notes"
            rows={2}
            maxLength={500}
            aria-invalid={!!errors.notes}
            {...register('notes')}
          />
        </Field>
      </div>
    </fieldset>
  );
}
