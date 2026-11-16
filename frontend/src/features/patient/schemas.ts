/**
 * Client-side pre-validation of the profile forms. Mirrors UpdateAccountRequest,
 * UpdatePatientProfileRequest and UpdatePasswordRequest; the API stays the source of truth.
 */
import { z } from 'zod';
import type { TFunction } from '@/i18n/translate';
import { BUSINESS_TZ, todayKey } from '@/lib/dates';
import { EGYPT_PHONE, passwordSchema } from '@/lib/validation';
import type { PatientProfile, PatientProfilePayload } from './types';

const NAME_MAX = 120;
/** Exclusive lower bound of a date of birth (backend: after:1900-01-01). */
export const BIRTH_DATE_AFTER = '1900-01-01';

export function accountSchema(t: TFunction) {
  return z.object({
    name: z.string().trim().min(3, t('validation.nameMin')).max(NAME_MAX, t('validation.max')),
    phone: z
      .string()
      .trim()
      .refine((v) => v === '' || EGYPT_PHONE.test(v), t('validation.phone')),
    locale: z.enum(['ar', 'en']),
  });
}
export type AccountValues = z.infer<ReturnType<typeof accountSchema>>;

/** A real calendar date (YYYY-MM-DD) after 1900-01-01 and before today in the business timezone. */
export function isBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  return value > BIRTH_DATE_AFTER && value < todayKey(BUSINESS_TZ);
}

/** Empty strings stand for "not specified" in the form and become null in the payload. */
export function personalSchema(t: TFunction) {
  return z.object({
    date_of_birth: z
      .string()
      .refine((v) => v === '' || isBirthDate(v), t('patient.dateOfBirthInvalid')),
    gender: z.enum(['', 'male', 'female']),
    governorate_id: z.string(),
    city_id: z.string(),
  });
}
export type PersonalValues = z.infer<ReturnType<typeof personalSchema>>;

export function personalValuesOf(profile: PatientProfile): PersonalValues {
  return {
    date_of_birth: profile.date_of_birth ?? '',
    gender: profile.gender ?? '',
    governorate_id: profile.governorate_id ?? '',
    city_id: profile.city_id ?? '',
  };
}

export function personalPayloadOf(values: PersonalValues): PatientProfilePayload {
  return {
    date_of_birth: values.date_of_birth || null,
    gender: values.gender || null,
    governorate_id: values.governorate_id || null,
    city_id: values.city_id || null,
  };
}

export function changePasswordSchema(t: TFunction) {
  return z
    .object({
      current_password: z.string().min(1, t('validation.required')),
      password: passwordSchema(t),
      password_confirmation: z.string().min(1, t('validation.required')),
    })
    .refine((d) => d.password === d.password_confirmation, {
      path: ['password_confirmation'],
      message: t('validation.passwordMatch'),
    });
}
export type ChangePasswordValues = z.infer<ReturnType<typeof changePasswordSchema>>;
