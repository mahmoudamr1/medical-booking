/**
 * Types for the clinic (organization) area — mirror backend controllers in
 * app/Http/Controllers/Api/V1/Clinic/* and Public/ClinicDirectoryController.
 */
import type {
  AppointmentStatus,
  Bilingual,
  Branch,
  BranchHours,
  CurrentUser,
  DoctorCard,
  Service,
  VerificationStatus,
} from '@/types/api';

export type ClinicType = 'hospital' | 'medical_center' | 'clinic';
export const CLINIC_TYPES: ClinicType[] = ['hospital', 'medical_center', 'clinic'];

export type ClinicRole = 'owner' | 'manager' | 'receptionist';
export type StaffRole = Exclude<ClinicRole, 'owner'>;
export type MembershipStatus = 'invited' | 'active' | 'suspended';
/** Statuses staff management may set (an invitation is only ever accepted by the invitee). */
export type StaffStatus = Exclude<MembershipStatus, 'invited'>;
export type AffiliationStatus = 'active' | 'ended';

/** backend app/Enums/ClinicPermission.php */
export const CLINIC_PERMISSIONS = {
  manageOrganization: 'clinic.organization.manage',
  manageBranches: 'clinic.branches.manage',
  manageStaff: 'clinic.staff.manage',
  manageDoctors: 'clinic.doctors.manage',
  viewAppointments: 'clinic.appointments.view',
  bookAppointments: 'clinic.appointments.book',
  manageAppointments: 'clinic.appointments.manage',
  viewSchedules: 'clinic.schedules.view',
  viewReports: 'clinic.reports.view',
} as const;

export type ClinicPermission = (typeof CLINIC_PERMISSIONS)[keyof typeof CLINIC_PERMISSIONS];

// ---- Public directory -----------------------------------------------------------

export interface ClinicSummary extends Bilingual {
  /** Relative same-origin logo URL (/api/v1/clinics/{slug}/logo) or null. */
  logo_url?: string | null;
  /** Facility type (hospital | medical_center | clinic). */
  type?: ClinicType;
  id: string;
  slug: string;
  is_personal_practice: boolean;
  doctors_count: number | null;
  branches_count: number;
  cities: { name_ar: string | null; name_en: string | null }[];
}

export interface ClinicPublic extends ClinicSummary {
  description_ar: string | null;
  description_en: string | null;
  phone: string | null;
  email: string | null;
  branches: Branch[];
  doctors: DoctorCard[];
  services: Service[];
}

export interface ClinicDirectoryParams {
  q?: string;
  governorate?: string;
  city?: string;
  type?: string;
  page?: string;
  per_page?: string;
  [key: string]: string | undefined;
}

// ---- Membership / management ----------------------------------------------------

/** ClinicManageResource */
export interface ClinicManage extends Bilingual {
  id: string;
  slug: string;
  description_ar: string | null;
  description_en: string | null;
  phone: string | null;
  email: string | null;
  status: 'active' | 'suspended';
  is_personal_practice: boolean;
  created_at: string | null;
}

/** One active membership from GET /auth/me → clinics[] (id, names, role, permissions). */
export type ClinicMembership = CurrentUser['clinics'][number];

export type InvitationDecision = 'accept' | 'decline';

export interface ClinicInvitation {
  id: string;
  role: ClinicRole;
  clinic: { id: string; slug: string; name_ar: string; name_en: string | null };
}

export interface StaffMember {
  id: string;
  role: ClinicRole;
  status: MembershipStatus;
  joined_at: string | null;
  user: { id: string; name: string; email: string; phone: string | null } | null;
}

export interface ClinicAffiliation {
  id: string;
  status: AffiliationStatus;
  branch: { id: string; name_ar: string; name_en: string | null };
  doctor: {
    id: string;
    name: string;
    email: string;
    title_ar: string | null;
    title_en: string | null;
    verification_status: VerificationStatus;
    specialties: { id: string; name_ar: string; name_en: string | null }[];
  };
}

export interface ClinicScheduleWindow {
  id: string;
  doctor: { id: string; name: string };
  clinic_branch_id: string | null;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  breaks: { starts_at: string; ends_at: string }[];
}

export interface ClinicReport {
  range: { from: string; to: string };
  totals: {
    total: number;
    confirmed: number;
    pending: number;
    completed: number;
    cancelled: number;
    no_show: number;
    completed_revenue: number;
  };
  by_doctor: {
    doctor_id: string;
    name: string;
    total: number | string;
    completed: number | string;
    cancelled: number | string;
  }[];
  by_branch: {
    branch_id: string;
    name_ar: string;
    name_en: string | null;
    total: number | string;
  }[];
  by_day: { day: string; total: number | string }[];
  organization: { branches: number; doctors: number; staff: number };
}

// ---- Payloads ---------------------------------------------------------------------

export interface ClinicDetailsPayload {
  name_ar?: string;
  name_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  phone?: string | null;
  email?: string | null;
}

/** POST /clinics requires the Arabic name; PUT …/manage accepts a partial payload. */
export type ClinicCreatePayload = ClinicDetailsPayload & { name_ar: string };

export interface BranchPayload {
  name_ar?: string;
  name_en?: string;
  city_id?: string;
  area_id?: string | null;
  address_ar?: string;
  address_en?: string | null;
  phone?: string | null;
  is_active?: boolean;
}

export type BranchHoursPayload = BranchHours[];

export interface InviteStaffPayload {
  email: string;
  role: StaffRole;
}

export interface StaffUpdatePayload {
  role?: StaffRole;
  status?: StaffStatus;
}

export interface AffiliateDoctorPayload {
  doctor_email: string;
  clinic_branch_id: string;
}

/** Half-open instant range `[from, to)` (UTC ISO) the appointment and report endpoints filter by. */
export interface InstantRange {
  from?: string;
  to?: string;
}

export interface ClinicAppointmentFilters extends InstantRange {
  branch_id?: string;
  doctor_id?: string;
  status?: AppointmentStatus;
  q?: string;
  page?: number;
  per_page?: number;
}

export interface BookOnBehalfPayload {
  doctor_id: string;
  service_id: string;
  starts_at: string;
  patient_email: string;
  patient_name?: string;
  patient_phone?: string;
  notes?: string;
}
