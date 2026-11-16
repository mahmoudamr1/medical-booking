import type { Locale } from '@/types/api';

export type Gender = 'male' | 'female';

export interface PatientProfile {
  id: string;
  /** Calendar date, YYYY-MM-DD. */
  date_of_birth: string | null;
  gender: Gender | null;
  governorate_id: string | null;
  city_id: string | null;
}

export type PatientProfilePayload = Omit<PatientProfile, 'id'>;

export interface AccountPayload {
  name: string;
  phone: string | null;
  locale: Locale;
}

export type ConsentType = 'terms' | 'urgent_data_sharing' | 'marketing' | 'medical_data_processing';

/** Only these can be changed via PUT /consents/{type}; the others are recorded by their own flows. */
export const EDITABLE_CONSENTS: readonly ConsentType[] = ['marketing', 'medical_data_processing'];

export interface Consent {
  type: ConsentType;
  granted: boolean;
  updated_at: string | null;
}
