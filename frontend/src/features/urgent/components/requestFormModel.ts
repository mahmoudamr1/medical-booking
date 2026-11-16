import { Building2, CircleAlert, Clock, Siren, Video } from 'lucide-react';
import { z } from 'zod';
import type { TFunction } from '@/i18n/translate';
import type { UrgentCreatePayload } from '../types';
import type { Choice } from './ChoiceCards';
import { EGYPT_PHONE } from '@/lib/validation';

/** Validation for the urgent request form (mirrors the API rules in contracts/urgent-v2.md). */
export function buildRequestSchema(t: TFunction) {
  return z
    .object({
      severity: z.enum(['critical', 'urgent', 'standard']),
      consent: z.boolean().refine((v) => v, t('urgent.form.mustAccept')),
      specialty_id: z.string(),
      description: z
        .string()
        .trim()
        .min(10, t('urgent.form.descriptionMin'))
        .max(1000, t('urgent.form.descriptionMax')),
      consultation_type: z.enum(['online', 'in_person']),
      governorate_id: z.string().min(1, t('validation.required')),
      city_id: z.string(),
      area_id: z.string(),
      location_details: z.string().trim().max(500, t('validation.max')),
      contact_phone: z.string().trim().regex(EGYPT_PHONE, t('validation.phone')),
    })
    .superRefine((v, ctx) => {
      if (v.consultation_type === 'in_person' && !v.location_details) {
        ctx.addIssue({
          code: 'custom',
          path: ['location_details'],
          message: t('urgent.form.locationRequired'),
        });
      }
    });
}

export type RequestValues = z.infer<ReturnType<typeof buildRequestSchema>>;

/** Form fields the API can return validation errors for. */
export const REQUEST_FIELDS = [
  'severity',
  'consent',
  'specialty_id',
  'description',
  'consultation_type',
  'governorate_id',
  'city_id',
  'area_id',
  'location_details',
  'contact_phone',
] as const;

export function requestDefaults(phone?: string | null): RequestValues {
  return {
    severity: 'urgent',
    consent: false,
    specialty_id: '',
    description: '',
    consultation_type: 'online',
    governorate_id: '',
    city_id: '',
    area_id: '',
    location_details: '',
    contact_phone: phone ?? '',
  };
}

export function toPayload(v: RequestValues, preferredId: string | null): UrgentCreatePayload {
  return {
    severity: v.severity,
    preferred_doctor_id: preferredId,
    consent: true,
    specialty_id: v.specialty_id || null,
    description: v.description,
    consultation_type: v.consultation_type,
    governorate_id: v.governorate_id,
    city_id: v.city_id || null,
    area_id: v.city_id && v.area_id ? v.area_id : null,
    location_details: v.location_details || null,
    contact_phone: v.contact_phone,
  };
}

export function severityChoices(t: TFunction): Choice[] {
  return [
    {
      value: 'critical',
      label: t('urgent.severity.critical'),
      hint: t('urgent.severity.criticalHint'),
      icon: Siren,
      tone: 'rose',
    },
    {
      value: 'urgent',
      label: t('urgent.severity.urgent'),
      hint: t('urgent.severity.urgentHint'),
      icon: CircleAlert,
      tone: 'amber',
    },
    {
      value: 'standard',
      label: t('urgent.severity.standard'),
      hint: t('urgent.severity.standardHint'),
      icon: Clock,
      tone: 'sky',
    },
  ];
}

export function consultationChoices(t: TFunction): Choice[] {
  return [
    {
      value: 'online',
      label: t('urgent.mode.online'),
      hint: t('urgent.form.onlineHint'),
      icon: Video,
    },
    {
      value: 'in_person',
      label: t('urgent.mode.in_person'),
      hint: t('urgent.form.inPersonHint'),
      icon: Building2,
    },
  ];
}
