# Data Model: Medical Booking Platform (PostgreSQL 18)

Conventions: snake_case plural tables; ULID `id` (`char(26)`) for domain entities, `bigint identity`
for append-only internals; all timestamps `timestamptz`; money `numeric(10,2)` EGP with
`CHECK (>= 0)`; enums stored as `varchar` with `CHECK (col IN (...))` mirrored by PHP backed enums.
Extensions: `btree_gist`, `pg_trgm`.

## Identity & access

| Table | Key columns | Constraints / indexes |
|---|---|---|
| users | id, name, email, phone?, password, locale (`ar`/`en`), status (`active`,`suspended`), email_verified_at, last_login_at, remember_token | UNIQUE(email), UNIQUE(phone) WHERE phone NOT NULL |
| roles | id bigint, name (`patient`,`doctor`,`admin`), label_ar, label_en | UNIQUE(name) |
| permissions | id bigint, name (e.g. `doctors.verify`) | UNIQUE(name) |
| role_permissions | role_id, permission_id | PK(role_id, permission_id), FK cascade |
| user_roles | user_id, role_id, created_at | PK(user_id, role_id), FK cascade |
| patient_profiles | id, user_id, date_of_birth?, gender?, governorate_id?, city_id? | UNIQUE(user_id) |
| doctor_profiles | id, user_id, title_ar/en, bio_ar/en, qualifications (text), years_experience (≥0), gender?, avatar_path?, license_number, verification_status (`draft`,`pending`,`approved`,`rejected`,`suspended`), verification_notes, verified_at, verified_by?, is_active, accepts_bookings, booking_mode (`instant`,`manual`), min_cancellation_hours (≥0, default 12), lead_time_minutes (≥0, default 60), horizon_days (1–365, default 60), buffer_minutes (0–120), timezone (default `Africa/Cairo`), rating_avg numeric(3,2), rating_count, min_price, next_available_at?, search_text | UNIQUE(user_id); IDX(verification_status, is_active); GIN trgm(search_text); IDX(rating_avg), IDX(min_price) |
| doctor_documents | id, doctor_profile_id, type (`license`,`id_card`,`certificate`,`other`), disk, path, original_name, mime, size | FK cascade; private storage |

## Geography (supporting, global)

| governorates | id, name_ar, name_en, slug | UNIQUE(slug) |
| cities | id, governorate_id, name_ar, name_en, slug | UNIQUE(governorate_id, slug) |
| areas | id, city_id, name_ar, name_en, slug | UNIQUE(city_id, slug) |

## Medical directory

| Table | Key columns | Constraints / indexes |
|---|---|---|
| specialties | id, slug, name_ar, name_en, description_ar/en, icon, is_active, sort_order | UNIQUE(slug); IDX(is_active, sort_order) |
| doctor_specialties | doctor_profile_id, specialty_id, is_primary | PK(both); IDX(specialty_id) |
| clinics (tenant) | id, owner_user_id, name_ar, name_en, slug, description, phone, email, logo_path, status (`active`,`suspended`) | UNIQUE(slug) |
| clinic_memberships | id, clinic_id, user_id, role (`owner`,`manager`,`receptionist`), status (`invited`,`active`,`suspended`), invited_by, joined_at | UNIQUE(clinic_id, user_id); IDX(user_id) |
| clinic_branches | id, clinic_id, name_ar/en, governorate_id, city_id, area_id?, address_ar/en, phone, latitude?, longitude?, is_active | IDX(clinic_id); IDX(city_id); IDX(governorate_id) |
| branch_hours | id, clinic_branch_id, day_of_week (0–6), opens_at time, closes_at time | CHECK closes>opens; UNIQUE(branch, day, opens_at) |
| doctor_branch_affiliations | id, doctor_profile_id, clinic_branch_id, clinic_id (denormalized for tenant scoping), status (`active`,`ended`) | UNIQUE(doctor, branch); IDX(clinic_id) |
| medical_services | id, doctor_profile_id, clinic_branch_id? (null = doctor's own/online), clinic_id? (denorm), name_ar/en, consultation_type (`in_person`,`online`,`home_visit`), duration_minutes (5–240), price ≥0, is_active | IDX(doctor_profile_id, is_active); IDX(clinic_id) |

Independent doctors: a doctor with no clinic gets a personal branch-less service set (online) or a
"private clinic" (a clinic they own) — the onboarding creates a personal clinic + branch when the
doctor enters a practice address, so all in-person scheduling is branch-based.

## Scheduling

| Table | Key columns | Constraints / indexes |
|---|---|---|
| doctor_schedules | id, doctor_profile_id, clinic_branch_id? (null = online), day_of_week 0–6, starts_at time, ends_at time, is_active | CHECK ends>starts; IDX(doctor_profile_id, day_of_week) |
| schedule_breaks | id, doctor_schedule_id, starts_at time, ends_at time | CHECK ends>starts; FK cascade |
| schedule_exceptions | id, doctor_profile_id, clinic_branch_id?, date, type (`closed`,`custom_hours`), starts_at?, ends_at?, reason | CHECK custom_hours ⇒ times non-null & ends>starts; IDX(doctor_profile_id, date) |
| appointments | id, reference (unique human code, e.g. `MB-7KQ2X9`), doctor_profile_id, patient_profile_id, medical_service_id, clinic_branch_id?, clinic_id?, consultation_type, starts_at, ends_at, blocked_until, price, status, hold_expires_at?, booked_by_user_id, booked_via (`patient`,`clinic_staff`,`admin`), patient_notes, cancelled_by_user_id?, cancellation_reason?, cancelled_at?, rescheduled_from_id?, completed_at?, reminded_at? | CHECK ends>starts, blocked_until>=ends, price>=0, status IN(…); **EXCLUDE gist (doctor_profile_id =, tstzrange(starts_at, blocked_until,'[)') &&) WHERE status IN ('pending_confirmation','confirmed')**; IDX(doctor_profile_id, starts_at); IDX(patient_profile_id, starts_at); IDX(clinic_id, starts_at); IDX(status, hold_expires_at) |
| appointment_status_histories | id bigint, appointment_id, from_status?, to_status, actor_user_id?, actor_role, reason?, metadata jsonb, created_at | IDX(appointment_id, created_at) |

### Appointment state machine

```
pending_confirmation → confirmed | rejected | expired | cancelled_by_* 
confirmed            → completed | no_show | cancelled_by_*
(completed, rejected, expired, no_show, cancelled_*) → terminal
```
Actor rules: patient → cancelled_by_patient (own, within notice); doctor → confirm/reject/
complete/no_show/cancelled_by_doctor (own); clinic staff (permission) → confirm/cancelled_by_clinic
/complete/no_show (own clinic); admin → cancelled_by_admin; system → expired.
Rescheduling = create new appointment (`rescheduled_from_id`) + cancel old with reason
`rescheduled`, in one transaction (new insert first).

## Reviews

| reviews | id, appointment_id, doctor_profile_id, patient_profile_id, rating 1–5, comment?, status (`published`,`hidden`), moderated_by?, moderated_at? | UNIQUE(appointment_id); CHECK rating; IDX(doctor_profile_id, status) |
| review_reports | id, review_id, reporter_user_id, reason, status (`open`,`resolved`,`dismissed`), resolved_by? | UNIQUE(review_id, reporter_user_id) |

## Urgent assistance

| Table | Key columns | Constraints / indexes |
|---|---|---|
| volunteer_profiles | id, doctor_profile_id, status (`active`,`inactive`), max_concurrent_requests (1–10), accepts_online, accepts_in_person, opted_in_at, last_availability_update_at | UNIQUE(doctor_profile_id) |
| volunteer_specialties | volunteer_profile_id, specialty_id | PK(both) |
| volunteer_locations | id, volunteer_profile_id, governorate_id, city_id?, area_id? | IDX(governorate_id, city_id) |
| volunteer_availabilities | id, volunteer_profile_id, starts_at, ends_at, mode (`online`,`in_person`,`both`), kind (`now`,`tonight`,`scheduled`) | CHECK ends>starts; IDX(volunteer_profile_id, ends_at) |
| urgent_requests | id, patient_profile_id, specialty_id?, description (≤1000), consultation_type, governorate_id, city_id?, area_id?, location_details? (cleared after close), contact_phone, disclaimer_acknowledged_at, consent_id, status, current_tier (0–3), accepted_doctor_profile_id?, accepted_at?, gp_disclosure bool, closed_at?, expires_at | CHECK status IN(…); CHECK (status IN ('accepted','in_progress','completed')) = (accepted_doctor_profile_id IS NOT NULL) when accepted…; IDX(status); IDX(patient_profile_id, created_at) |
| urgent_request_dispatches | id bigint, urgent_request_id, doctor_profile_id, tier, status (`notified`,`declined`,`accepted`,`lost`,`expired`), notified_at, responded_at?, viewed_at? | UNIQUE(urgent_request_id, doctor_profile_id); **UNIQUE(urgent_request_id) WHERE status='accepted'**; IDX(doctor_profile_id, status) |

Urgent status machine: `created → searching → notifying → accepted → in_progress → completed`;
`searching|notifying → unmatched | cancelled | expired`; `accepted|in_progress → cancelled`.

## Notifications, security, settings

| notifications | Laravel standard (uuid id, type, notifiable morph, data jsonb, read_at) |
| audit_logs | id bigint, actor_user_id?, action, subject_type, subject_id, ip, user_agent, changes jsonb, created_at | IDX(subject_type, subject_id); IDX(actor_user_id, created_at); IDX(action) |
| consents | id, user_id, type (`urgent_data_sharing`,`terms`,`marketing`), granted bool, version, granted_at, revoked_at?, ip | IDX(user_id, type) |
| platform_settings | key (PK), value jsonb, updated_by | — |
| password_reset_tokens, sessions, cache, jobs, failed_jobs, job_batches | Laravel standard |
| personal_access_tokens | Sanctum standard (not used by SPA; kept for future integrations) |

## Key relationships

User 1–0..1 PatientProfile; User 1–0..1 DoctorProfile; User *–* Role; DoctorProfile *–* Specialty;
Clinic 1–* Branch; Clinic 1–* Membership *–1 User; DoctorProfile *–* Branch via Affiliation;
DoctorProfile 1–* Service, Schedule, Exception, Appointment; PatientProfile 1–* Appointment;
Appointment 1–* StatusHistory; Appointment 1–0..1 Review; UrgentRequest 1–* Dispatch,
0..1 accepted DoctorProfile.

## Tenant scoping

Tenant-owned: clinic_memberships, clinic_branches, branch_hours, doctor_branch_affiliations,
clinic-branch medical_services, appointments with clinic_id. Clinic routes are nested under
`/clinics/{clinic}` and resolved through `ClinicContext` middleware that requires an active
membership; queries use `->where('clinic_id', $clinic->id)` scopes; cross-tenant lookups return 404.
