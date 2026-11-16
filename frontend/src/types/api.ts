/**
 * Cross-cutting API types: the response envelope, pagination and the entities shared by several
 * features and by components/shared (feature-only shapes live in features/<x>/types.ts).
 * Keep in sync with the backend — the API is the source of truth.
 */

export type Locale = 'ar' | 'en';

export interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta?: { pagination?: Pagination };
}

export interface ApiFailure {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

// ---- Shared ------------------------------------------------------------------

export interface Bilingual {
  name_ar: string;
  name_en: string | null;
}

export interface Location extends Bilingual {
  id: string;
  slug: string;
}

export interface Specialty extends Bilingual {
  id: string;
  slug: string;
  description_ar: string | null;
  description_en: string | null;
  icon: string | null;
  is_general_practice: boolean;
  is_primary?: boolean;
  doctors_count?: number;
}

export interface BranchHours {
  day_of_week: number;
  opens_at: string;
  closes_at: string;
}

export interface Branch extends Bilingual {
  id: string;
  clinic_id: string;
  address_ar: string | null;
  address_en: string | null;
  phone: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  is_active: boolean;
  governorate?: Location | null;
  city?: Location | null;
  area?: Location | null;
  clinic?: {
    id: string;
    slug: string;
    name_ar: string;
    name_en: string | null;
    is_personal_practice: boolean;
    logo_url?: string | null;
  };
  hours?: BranchHours[];
}

export type ConsultationType = 'in_person' | 'online' | 'home_visit';

export type BookingMode = 'instant' | 'manual';

export type VerificationStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Service extends Bilingual {
  id: string;
  doctor_id: string;
  consultation_type: ConsultationType;
  duration_minutes: number;
  price: number;
  currency: 'EGP';
  is_active: boolean;
  branch?: Branch | null;
}

// ---- Doctors -----------------------------------------------------------------

export interface DoctorCard {
  id: string;
  name: string;
  title_ar: string | null;
  title_en: string | null;
  gender: 'male' | 'female' | null;
  avatar_url: string | null;
  years_experience: number | null;
  rating_avg: number;
  rating_count: number;
  min_price: number | null;
  currency: 'EGP';
  next_available_at: string | null;
  accepts_bookings: boolean;
  verified: boolean;
  specialties?: Specialty[];
  primary_branch: Branch | null;
  consultation_types?: ConsultationType[];
}

export interface DoctorPublic extends DoctorCard {
  bio_ar: string | null;
  bio_en: string | null;
  qualifications: string | null;
  booking_mode: BookingMode;
  min_cancellation_hours: number;
  timezone: string;
  branches?: Branch[];
  services?: Service[];
}

// ---- Appointments ------------------------------------------------------------

export type AppointmentStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'completed'
  | 'cancelled_by_patient'
  | 'cancelled_by_doctor'
  | 'cancelled_by_clinic'
  | 'cancelled_by_admin'
  | 'rejected'
  | 'expired'
  | 'no_show';

export type AppointmentGroup = 'upcoming' | 'pending' | 'completed' | 'cancelled';

export type AppointmentAction = 'confirm' | 'reject' | 'complete' | 'no-show' | 'cancel';

export interface AppointmentHistoryEntry {
  from: AppointmentStatus | null;
  to: AppointmentStatus;
  actor_role: string;
  reason: string | null;
  at: string;
}

export interface Appointment {
  id: string;
  reference: string;
  status: AppointmentStatus;
  group: AppointmentGroup;
  consultation_type: ConsultationType;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  timezone: string | null;
  price: number;
  currency: 'EGP';
  hold_expires_at: string | null;
  booked_via: string | null;
  patient_notes: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  rescheduled_from_id: string | null;
  created_at: string | null;
  doctor: {
    id: string;
    name: string | null;
    title_ar: string | null;
    title_en: string | null;
    min_cancellation_hours: number;
    specialties: Specialty[];
  } | null;
  patient?: { id: string; name: string | null; phone: string | null; email: string | null };
  service?: { id: string; name_ar: string; name_en: string | null };
  branch?: Branch | null;
  can: { cancel: boolean; reschedule: boolean; review: boolean } | null;
  history?: AppointmentHistoryEntry[];
}

// ---- Users -------------------------------------------------------------------

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  locale: Locale;
  email_verified: boolean;
  roles: string[];
  permissions: string[];
  patient_profile_id: string | null;
  doctor_profile: {
    id: string;
    verification_status: VerificationStatus;
    is_active: boolean;
    volunteer_active?: boolean;
  } | null;
  clinics: {
    id: string;
    slug: string;
    name_ar: string;
    name_en: string | null;
    role: string;
    permissions: string[];
  }[];
}
