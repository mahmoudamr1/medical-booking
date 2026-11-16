/**
 * Live urgent consultation (volunteer doctors). Shapes mirror backend and
 * specs/002-urgent-live-consultation/contracts/urgent-v2.md:
 * - UrgentRequestResource (viewer-aware: patient | accepted_doctor | dispatched_doctor | admin)
 * - Public available-doctors list, messages, admin live board, clinic availability
 * - Doctor\VolunteerController::row()
 */

/** Every status the API returns, in lifecycle order (`waiting` = kept open until a doctor is available). */
export const URGENT_STATUSES = [
  'searching',
  'notifying',
  'waiting',
  'accepted',
  'in_progress',
  'completed',
  'cancelled',
  'unmatched',
  'expired',
] as const;

export type UrgentStatus = (typeof URGENT_STATUSES)[number];

export type UrgentConsultationType = 'online' | 'in_person';

/** Patient-chosen severity (never a diagnosis). critical = one immediate wave to every eligible doctor. */
export type UrgentSeverity = 'critical' | 'urgent' | 'standard';

/** A doctor the patient asked for by name (directed request). */
export interface UrgentDoctorRef {
  id: string;
  name: string;
}

/** Per-doctor dispatch state (only present for doctor viewers). */
export type UrgentDispatchStatus = 'notified' | 'accepted' | 'declined' | 'lost' | 'expired';

export interface UrgentPlace {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface UrgentRequest {
  id: string;
  status: UrgentStatus;
  /** 1–3 escalation tier; null before the first dispatch. */
  current_tier: number | null;
  /** True once tier 3 (general practitioners) was reached — must be disclosed to the patient. */
  gp_disclosure: boolean;
  consultation_type: UrgentConsultationType;
  description: string;
  specialty: UrgentPlace | null;
  governorate: UrgentPlace | null;
  city: UrgentPlace | null;
  /** Redacted (null) for dispatched-but-not-accepted doctors. */
  area: UrgentPlace | null;
  location_details: string | null;
  patient: { name: string | null; contact_phone: string | null } | null;
  accepted_doctor: {
    id: string;
    name: string | null;
    title_ar: string | null;
    title_en: string | null;
    /** Revealed to the patient only. */
    phone: string | null;
  } | null;
  accepted_at: string | null;
  started_at: string | null;
  closed_at: string | null;
  close_reason: string | null;
  expires_at: string | null;
  /** Deadline of a request kept open for a doctor to become available; null when waiting is disabled. */
  keep_open_until: string | null;
  created_at: string | null;
  severity: UrgentSeverity;
  /** The doctor the patient asked for (directed dispatch), if any. */
  preferred_doctor: UrgentDoctorRef | null;
  /** Doctor's note on completion (patient, accepted doctor and admins only). */
  outcome_note: string | null;
  time_to_accept_seconds: number | null;
  /** Seconds since submission while the request is still looking for a doctor; null afterwards. */
  waiting_seconds: number | null;
  /** Unread messages for the viewer (always 0 for non-participants). */
  unread_messages: number;
  /** Doctor viewers only: this doctor's own dispatch. */
  my_dispatch_status?: UrgentDispatchStatus | null;
  /** Doctor viewers only: the patient asked for this doctor specifically. */
  directed_to_me?: boolean;
}

export interface UrgentCreatePayload {
  severity: UrgentSeverity;
  /** Directed request: notify this doctor first, then fall back to everyone available. */
  preferred_doctor_id?: string | null;
  consent: true;
  specialty_id?: string | null;
  description: string;
  consultation_type: UrgentConsultationType;
  governorate_id: string;
  city_id?: string | null;
  area_id?: string | null;
  location_details?: string | null;
  contact_phone: string;
}

// ---- Live availability ----------------------------------------------------------------

export interface UrgentSpecialty {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
}

/** A verified, opted-in doctor with a current availability window and free capacity (public fields only). */
export interface AvailableDoctor {
  id: string;
  name: string;
  title_ar: string | null;
  title_en: string | null;
  avatar_url: string | null;
  rating_avg: number;
  rating_count: number;
  specialties: UrgentSpecialty[];
  /** What the doctor accepts right now. */
  modes: UrgentConsultationType[];
  /** Coverage summary (first location). */
  city: { name_ar: string; name_en: string } | null;
  /** End of the current availability window. */
  available_until: string;
  load: { active: number; max: number };
}

export interface AvailableDoctorsResult {
  count: number;
  doctors: AvailableDoctor[];
}

export interface AvailableDoctorsFilters {
  /** Specialty slug or id. */
  specialty?: string;
  governorate?: string;
  mode?: UrgentConsultationType;
}

// ---- Messages ---------------------------------------------------------------------

/** The two participants of a request's thread. */
export type UrgentParty = 'patient' | 'doctor';

export interface UrgentMessage {
  id: number;
  body: string;
  sender: UrgentParty;
  /** Sent by the current viewer. */
  mine: boolean;
  created_at: string;
}

// ---- Admin live board -------------------------------------------------------------

interface Place {
  id: string;
  name_ar: string;
  name_en: string | null;
}

export interface AdminUrgentRequest {
  id: string;
  status: UrgentStatus;
  current_tier: number | null;
  gp_disclosure: boolean | null;
  consultation_type: string | null;
  description: string | null;
  specialty: Place | null;
  governorate: Place | null;
  city: Place | null;
  area: Place | null;
  location_details: string | null;
  patient: { name: string | null; contact_phone: string | null } | null;
  accepted_doctor: {
    id: string;
    name: string | null;
    title_ar: string | null;
    title_en: string | null;
    phone: string | null;
  } | null;
  accepted_at: string | null;
  started_at: string | null;
  closed_at: string | null;
  close_reason: string | null;
  expires_at: string | null;
  keep_open_until: string | null;
  created_at: string | null;
  flagged: { at: string | null; reason: string | null } | null;
  dispatch_summary?: Record<string, number> | unknown[];
}

export type AdminLiveUrgentRequest = AdminUrgentRequest & {
  severity: UrgentSeverity;
  preferred_doctor?: UrgentDoctorRef | null;
  time_to_accept_seconds?: number | null;
  waiting_seconds?: number;
};

export interface AdminUrgentLive {
  available_doctors: number;
  open: Record<UrgentSeverity, number>;
  oldest_waiting_seconds: number | null;
  avg_time_to_accept_seconds_today: number | null;
  unmatched_last_24h: number;
  flagged_open: number;
  doctors: AvailableDoctor[];
  open_requests: AdminLiveUrgentRequest[];
}

// ---- Clinic availability ----------------------------------------------------------

export type ClinicUrgentDoctor = AvailableDoctor & {
  affiliated_branch: { id: string; name_ar: string; name_en: string };
  available_now: boolean;
};

export interface ClinicUrgentAvailability {
  doctors: ClinicUrgentDoctor[];
  volunteers_total: number;
}

export type DoctorUrgentAction = 'accept' | 'decline' | 'start' | 'complete' | 'report';
export type DoctorUrgentTab = 'open' | 'accepted' | 'closed';

export interface PublicSettings {
  urgent_enabled: boolean;
  currency?: string;
  timezone?: string;
}

// ---- Volunteer --------------------------------------------------------------------

export type VolunteerMode = 'online' | 'in_person' | 'both';
export type VolunteerWindowKind = 'now' | 'tonight' | 'scheduled';

export interface VolunteerWindow {
  id: string;
  kind: VolunteerWindowKind;
  mode: VolunteerMode;
  starts_at: string;
  ends_at: string;
}

export interface VolunteerProfile {
  /** Doctor is verified + publicly visible (required to opt in). */
  eligible: boolean;
  opted_in: boolean;
  accepts_online: boolean;
  accepts_in_person: boolean;
  max_concurrent_requests: number;
  last_availability_update_at: string | null;
  available_now: boolean;
  specialties: UrgentSpecialty[];
  locations: { governorate: UrgentPlace; city: UrgentPlace | null }[];
  /** Current and future windows (ends_at > now), ordered by start. */
  windows: VolunteerWindow[];
}

export interface VolunteerUpdatePayload {
  opt_in: boolean;
  specialty_ids: string[];
  locations: { governorate_id: string; city_id?: string | null }[];
  accepts_online: boolean;
  accepts_in_person: boolean;
  max_concurrent_requests: number;
}

export type AvailabilityPayload =
  | { kind: 'now'; hours: number; mode: VolunteerMode }
  | { kind: 'tonight'; mode: VolunteerMode }
  | { kind: 'scheduled'; starts_at: string; ends_at: string; mode: VolunteerMode };
