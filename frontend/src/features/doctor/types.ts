/** Doctor self-service shapes (backend Doctor\* resources) and request payloads. */
import type {
  Appointment,
  BookingMode,
  Branch,
  Service,
  Specialty,
  VerificationStatus,
} from '@/types/api';

export interface DoctorPreferences {
  accepts_bookings: boolean;
  booking_mode: BookingMode;
  min_cancellation_hours: number;
  lead_time_minutes: number;
  horizon_days: number;
  buffer_minutes: number;
  timezone: string;
}

export const DOCUMENT_TYPES = ['license', 'id_card', 'certificate', 'other'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type DoctorGender = 'male' | 'female';

export interface DoctorDocument {
  id: string;
  type: DocumentType;
  original_name: string;
  mime: string;
  size: number;
  uploaded_at: string | null;
}

export interface DoctorSelf {
  id: string;
  name: string;
  email: string;
  title_ar: string | null;
  title_en: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  qualifications: string | null;
  years_experience: number | null;
  gender: DoctorGender | null;
  /** Public avatar URL (served by the API), or null when no photo was uploaded. */
  avatar_url: string | null;
  license_number: string | null;
  verification_status: VerificationStatus;
  verification_notes: string | null;
  verification_submitted_at: string | null;
  verified_at: string | null;
  is_active: boolean;
  preferences: DoctorPreferences;
  rating_avg: number;
  rating_count: number;
  specialties?: Specialty[];
  documents?: DoctorDocument[];
  branches?: Branch[];
}

export interface ScheduleBreak {
  starts_at: string;
  ends_at: string;
}

export interface ScheduleWindow {
  id?: string;
  clinic_branch_id: string | null;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  breaks: ScheduleBreak[];
}

export type ExceptionType = 'closed' | 'custom_hours';

export interface ScheduleException {
  id: string;
  date: string;
  type: ExceptionType;
  starts_at: string | null;
  ends_at: string | null;
  clinic_branch_id: string | null;
  reason: string | null;
}

export interface DoctorDashboard {
  counts: {
    today: number;
    upcoming: number;
    /** Requests awaiting confirmation that have not started yet (still confirmable). */
    pending: number;
    completed: number;
    cancelled: number;
    no_show: number;
  };
  rating_avg: number;
  rating_count: number;
  verification_status: VerificationStatus;
  next_available_at: string | null;
  today: Appointment[];
}

/** Editable profile fields (PUT /doctor/profile); the license is locked during and after review. */
export type DoctorProfilePayload = Partial<
  Pick<
    DoctorSelf,
    | 'title_ar'
    | 'title_en'
    | 'bio_ar'
    | 'bio_en'
    | 'qualifications'
    | 'years_experience'
    | 'gender'
    | 'license_number'
  >
>;

/** A schedule window as sent to PUT /doctor/schedules (the server assigns ids). */
export type ScheduleWindowPayload = Omit<ScheduleWindow, 'id'>;

/** Calendar date keys (YYYY-MM-DD, inclusive); without `from` the API lists today onwards. */
export interface ExceptionRange {
  from: string;
  to: string;
}

/** Appointment range query (ISO instants, max 62 days; `status` is a comma-separated list). */
export interface DoctorAppointmentsQuery {
  from: string;
  to: string;
  status?: string;
  page?: number;
  per_page?: number;
}

export interface ServicePayload {
  name_ar: string;
  name_en: string;
  consultation_type: Service['consultation_type'];
  clinic_branch_id?: string | null;
  duration_minutes: number;
  price: number;
  is_active?: boolean;
}

export interface PracticePayload {
  name_ar: string;
  name_en?: string;
  city_id: string;
  area_id?: string;
  address_ar: string;
  address_en?: string;
  phone?: string;
}

export interface ExceptionPayload {
  date: string;
  date_to?: string;
  type: ExceptionType;
  starts_at?: string;
  ends_at?: string;
  clinic_branch_id?: string | null;
  reason?: string;
}
