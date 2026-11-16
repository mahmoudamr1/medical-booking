import { z } from 'zod';
import type { TFunction } from '@/i18n/translate';

/** Mirrors backend rules (RegisterRequest / Password::min(8)->letters()->numbers()) for early UX feedback. */
/** Same pattern as the backend: optional +20 / 20 country code, optional leading 0, then 1[0125] + 8 digits. */
export const EGYPT_PHONE = /^(?:\+?20)?0?1[0125]\d{8}$/;

export function passwordSchema(t: TFunction) {
  return z
    .string()
    .min(8, t('validation.password'))
    .regex(/[A-Za-z]/, t('validation.password'))
    .regex(/\d/, t('validation.password'));
}

export function emailSchema(t: TFunction) {
  return z.string().trim().min(1, t('validation.required')).email(t('validation.email'));
}

export function registerSchema(t: TFunction) {
  return z
    .object({
      name: z.string().trim().min(3, t('validation.nameMin')).max(120),
      email: emailSchema(t),
      phone: z
        .string()
        .trim()
        .refine((v) => v === '' || EGYPT_PHONE.test(v), t('validation.phone')),
      password: passwordSchema(t),
      password_confirmation: z.string().min(1, t('validation.required')),
      accept_terms: z.boolean().refine((v) => v, t('validation.terms')),
    })
    .refine((d) => d.password === d.password_confirmation, {
      path: ['password_confirmation'],
      message: t('validation.passwordMatch'),
    });
}

export type RegisterValues = z.infer<ReturnType<typeof registerSchema>>;
