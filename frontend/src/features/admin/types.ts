/** Admin console shapes (backend Admin\* resources) and the value sets of their enums. */
import type { DoctorSelf } from '@/features/doctor';
import type { AppointmentStatus, Pagination, VerificationStatus } from '@/types/api';
import type { UrgentStatus } from '@/features/urgent';

export type { DoctorSelf as AdminDoctor };

/** One page of a paginated admin collection (`api.page`). */
export interface Page<T> {
  items: T[];
  pagination: Pagination;
}

export type DateRange = { from?: string; to?: string };

export interface AdminStats {
  range: { from: string; to: string };
  people: {
    total_patients: number;
    total_doctors: number;
    verified_doctors: number;
    pending_verifications: number;
    total_clinics: number;
    active_volunteers: number;
  };
  appointments: {
    total: number;
    upcoming: number;
    pending: number;
    completed: number;
    cancelled: number;
    no_show: number;
  };
  urgent: { open: number; unmatched: number; completed: number; flagged: number };
  reviews: { open_reports: number; hidden: number };
}

export const REPORT_GROUPS = ['day', 'specialty', 'clinic'] as const;
export type ReportGroupBy = (typeof REPORT_GROUPS)[number];

export interface AppointmentReportRow {
  key: string;
  label_ar: string | null;
  label_en: string | null;
  /** Postgres aggregates may arrive as strings. */
  total: number | string;
  completed: number | string;
  cancelled: number | string;
  completed_value: number | string;
}

export interface AppointmentReport {
  group_by: ReportGroupBy;
  rows: AppointmentReportRow[];
}

export const USER_ROLES = ['patient', 'doctor', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['active', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  status_reason: string | null;
  roles: string[];
  email_verified: boolean;
  last_login_at: string | null;
  created_at: string | null;
}

export const CLINIC_STATUSES = ['active', 'suspended'] as const;
export type ClinicStatus = (typeof CLINIC_STATUSES)[number];

export interface AdminClinic {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  is_personal_practice: boolean;
  status: ClinicStatus;
  owner: { id: string; name: string; email: string } | null;
  branches_count: number;
  staff_count: number;
  doctors_count: number;
  created_at: string | null;
}

export const REVIEW_STATUSES = ['published', 'hidden'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type ReviewModeration = 'hide' | 'restore';

export interface AdminReview {
  id: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  doctor: { id: string; name: string | null };
  patient: { name: string | null };
  open_reports_count: number | null;
  moderation_reason: string | null;
  moderated_at: string | null;
  created_at: string | null;
}

export const REPORT_STATUSES = ['open', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportDecision = 'resolve' | 'dismiss';

export interface AdminReviewReport {
  id: string;
  reason: string | null;
  status: ReportStatus;
  reporter: { id: string; name: string } | null;
  review: { id: string; rating: number; comment: string | null; status: ReviewStatus };
  created_at: string | null;
}

export interface AdminSpecialty {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  icon: string | null;
  is_active: boolean;
  is_general_practice: boolean;
  sort_order: number;
  doctors_count: number;
}

export interface SpecialtyPayload {
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  icon: string | null;
  is_active: boolean;
  is_general_practice: boolean;
  sort_order: number;
}

export interface AuditLogEntry {
  id: number | string;
  action: string;
  subject_type: string | null;
  subject_id: string | null;
  actor: { id: string; name: string; email: string } | null;
  ip_address: string | null;
  changes: unknown;
  created_at: string | null;
}

export interface PlatformSettings {
  urgent_enabled: boolean;
  pending_hold_minutes: number;
  urgent_tier1_timeout_seconds: number;
  urgent_tier2_timeout_seconds: number;
  urgent_tier3_timeout_seconds: number;
  urgent_critical_timeout_seconds: number;
  urgent_directed_timeout_seconds: number;
  urgent_requests_per_hour: number;
  urgent_location_retention_hours: number;
  reminder_hours_before: number;
}

export type DoctorDecision = 'approve' | 'reject' | 'suspend' | 'reinstate';

// ---- List queries (what each paginated endpoint accepts; '' means "not filtered") -------
// Type aliases (not interfaces) so they stay assignable to the API client's query record.

type PageQuery = { page?: number; per_page?: number };

export type DoctorsQuery = PageQuery & {
  verification_status?: VerificationStatus | '';
  q?: string;
};

export type UsersQuery = PageQuery & {
  q?: string;
  role?: UserRole | '';
  status?: UserStatus | '';
};

export type ClinicsQuery = PageQuery & { q?: string; status?: ClinicStatus | '' };

export type AppointmentsQuery = PageQuery &
  DateRange & {
    status?: AppointmentStatus | '';
    q?: string;
    doctor_id?: string;
    clinic_id?: string;
  };

export type UrgentRequestsQuery = PageQuery & { status?: UrgentStatus | ''; flagged?: boolean };

export type ReviewsQuery = PageQuery & { status?: ReviewStatus | ''; reported?: boolean };

export type ReviewReportsQuery = PageQuery & { status?: ReportStatus };

export type AuditLogsQuery = PageQuery &
  DateRange & {
    action?: string;
    actor_id?: string;
    subject_id?: string;
  };
