# API Documentation (v1)

Base URL: `/api/v1` (browser: same origin through the Next.js proxy; direct: `http://localhost:8000/api/v1`).
Source of truth for routes: `backend/routes/api.php` (`php artisan route:list --path=api/v1`).

## Authentication (Sanctum SPA cookies)

1. `GET /sanctum/csrf-cookie` → sets `XSRF-TOKEN` (readable) and the HTTP-only session cookie.
2. Send `X-XSRF-TOKEN: <decoded XSRF-TOKEN cookie>` on every POST/PUT/PATCH/DELETE.
3. `POST /api/v1/auth/login` regenerates the session. `POST /auth/logout` invalidates it.
No bearer tokens are issued to the SPA; nothing sensitive is stored in `localStorage`.

Headers: `Accept: application/json`, `Accept-Language: ar|en` (messages are localized; default `ar`).

## Envelope

```json
{ "success": true, "message": "Appointment booked successfully", "data": { "id": "01jx…", "status": "confirmed" } }
{ "success": true, "message": "Success", "data": [ … ], "meta": { "pagination": { "current_page": 1, "per_page": 12, "total": 57, "last_page": 5 } } }
{ "success": false, "message": "The submitted data is invalid", "code": "validation_failed",
  "errors": { "starts_at": ["The selected appointment is no longer available"] } }
```

| Status | Meaning | Typical `code` |
|---|---|---|
| 200/201/204 | OK / created / no content | — |
| 401 | Not signed in | `unauthenticated` |
| 403 | Not allowed / suspended | `forbidden`, `account_suspended` |
| 404 | Not found **or not visible to you** (tenant, unverified doctor, undispatched urgent request) | `not_found` |
| 409 | Business conflict | `booking_conflict`, `invalid_transition`, `policy_violation`, `urgent_already_accepted`, `not_accepted`, `closed`, `already_reviewed`, `self_review`, `too_early`, `too_late` |
| 419 | CSRF token expired | `csrf_mismatch` |
| 422 | Validation / business precondition | `validation_failed`, `preferred_doctor_unavailable`, `verification_incomplete`, `not_eligible`, `service_invalid`, `self_booking` |
| 429 | Rate limited | `rate_limited` |
| 500 | Unexpected (no internals leaked when `APP_DEBUG=false`) | `server_error` |

## Endpoints

Legend: 🌐 public · 🔐 signed in · 🩺 doctor role · 🏥 clinic member (`tenant:<permission>`) · 🛡 admin permission.

### Health & public
| Method | Path | | Notes |
|---|---|---|---|
| GET | /health | 🌐 | `{status, database, redis, time}`; 503 when degraded |
| GET | /home | 🌐 | specialties, recommended_doctors, available_soon, featured_clinics, popular_services, stats, urgent `{enabled}` |
| GET | /settings/public | 🌐 | urgent_enabled, currency, timezone, locales |
| GET | /urgent/available-doctors | 🌐 | `specialty (id|slug), governorate, mode`; 60/min → `{count, doctors: AvailableDoctor[]}` (see Urgent) |
| GET | /specialties, /specialties/{slug} | 🌐 | active only |
| GET | /locations/governorates, /locations/governorates/{id}/cities, /locations/cities/{id}/areas | 🌐 | |
| GET | /doctors | 🌐 | `q, specialty, governorate, city, area, clinic, min_price, max_price, min_rating, consultation_type, available_on, sort(recommended|rating|price_asc|price_desc|next_available|experience), page, per_page≤50` |
| GET | /doctors/{id}, /doctors/{id}/services, /doctors/{id}/reviews, /doctors/{id}/avatar | 🌐 | verified+active doctors only (404 otherwise) |
| GET | /doctors/{id}/availability | 🌐 | `service_id, date_from, date_to (≤14 days)` → `{timezone, days:[{date, slots:[{starts_at, ends_at}]}]}` |
| GET | /clinics, /clinics/{slug} | 🌐 | active clinics, public doctors only |

### Auth & account
| POST /auth/register `{name,email,phone?,password,password_confirmation,account_type:patient|doctor,locale?,accept_terms}` · POST /auth/login · POST /auth/logout · GET/PATCH /auth/me · PUT /auth/password · POST /auth/forgot-password · POST /auth/reset-password · POST /auth/email/verification-notification · GET /auth/verify-email/{id}/{hash} (signed) |
|---|

### Patient 🔐
| Method | Path | Notes |
|---|---|---|
| GET/PUT | /patient/profile | dob, gender, governorate, city |
| GET, PUT | /consents, /consents/{marketing|medical_data_processing} | append-only history |
| POST | /appointments `{doctor_id, service_id, starts_at, notes?}` | 201 confirmed / pending_confirmation; 409 `booking_conflict` |
| GET | /patient/appointments?group=upcoming|pending|completed|cancelled|past, /patient/appointments/summary | |
| GET | /appointments/{id} | participants, clinic staff, admins (policy). Every Appointment has `doctor.avatar_url` (string|null); when the viewer is the patient it also has `review: {rating, comment}|null` (key absent for other viewers) |
| POST | /appointments/{id}/cancel `{reason?}` | patient policy: ≥ doctor's `min_cancellation_hours` for confirmed |
| POST | /appointments/{id}/reschedule `{starts_at, service_id?}` | atomic; original untouched on failure |
| POST | /appointments/{id}/review `{rating 1–5, comment?}` | completed visits only, once |
| POST | /reviews/{id}/report `{reason}` | |
| GET/POST | /notifications, /notifications/unread-count, /notifications/{id}/read, /notifications/read-all | |
| POST | /urgent-requests | see Urgent below |
| GET | /patient/urgent-requests, /urgent-requests/{id}; POST /urgent-requests/{id}/cancel | |

### Doctor 🩺 (own data only)
| Method | Path |
|---|---|
| GET/PUT | /doctor/profile (includes `avatar_url` string|null) · PUT /doctor/specialties `{specialty_ids[], primary_id}` · POST /doctor/avatar |
| GET/POST/DELETE | /doctor/documents (multipart `type, file` ≤5 MB pdf/jpeg/png) · GET /doctor/documents/{id}/download |
| POST | /doctor/verification/submit |
| GET/PUT | /doctor/schedules `{schedules:[{clinic_branch_id|null, day_of_week 0–6, starts_at "HH:MM", ends_at, breaks:[{starts_at, ends_at}]}]}` (full replace) |
| GET/POST/DELETE | /doctor/exceptions `{date, date_to?, type: closed|custom_hours, starts_at?, ends_at?, clinic_branch_id?, reason?}` · GET `?from&to` (Y-m-d, `to ≥ from`, both optional): default lists today onwards; `from` opens past dates |
| GET/PUT | /doctor/preferences `{accepts_bookings, booking_mode: instant|manual, min_cancellation_hours, lead_time_minutes, horizon_days, buffer_minutes, timezone}` |
| GET/POST/PUT/DELETE | /doctor/services `{name_ar, name_en, consultation_type, clinic_branch_id (in_person), duration_minutes, price}` |
| GET | /doctor/dashboard (`counts{today, upcoming, pending, completed, cancelled, no_show}`; `pending` = pending requests not yet started) · /doctor/appointments?from&to&status · /doctor/branches · POST /doctor/practice |
| POST | /appointments/{id}/confirm · /reject `{reason}` · /complete · /no-show · /cancel `{reason}` |
| GET/PUT | /doctor/volunteer `{opt_in, specialty_ids[], locations[{governorate_id, city_id?}], accepts_online, accepts_in_person, max_concurrent_requests}` |
| POST/DELETE | /doctor/volunteer/availability `{kind: now (hours 1–12) | tonight | scheduled (starts_at, ends_at ≤24h), mode: online|in_person|both}` |
| GET | /doctor/urgent-requests?status=open|accepted|closed (open: severity first, then oldest; items include `severity, directed_to_me, waiting_seconds`; `meta.counts{open, accepted, closed}` = size of every tab, whatever `status` is) |
| POST | /urgent-requests/{id}/accept · /decline · /start · /complete `{outcome_note?≤2000}` · /report `{reason}` |

### Clinic 🏥 (`{clinic}` = clinic id; non-members get 404)
| Method | Path | Permission |
|---|---|---|
| POST | /clinics (create org; caller becomes owner) · GET /my/clinics · GET /my/invitations · POST /my/invitations/{id}/accept|decline | 🔐 |
| GET / PUT | /clinics/{clinic}/manage | member / organization.manage |
| GET · POST · PUT · DELETE · PUT …/hours | /clinics/{clinic}/branches[/{branch}] | member / branches.manage |
| GET · POST `{email, role: manager|receptionist}` · PUT `{role?, status?}` · DELETE | /clinics/{clinic}/staff[/{membership}] | staff.manage |
| GET · POST `{doctor_email, clinic_branch_id}` · DELETE | /clinics/{clinic}/doctors[/{affiliation}] | schedules.view / doctors.manage |
| GET | /clinics/{clinic}/services, /schedules?doctor_id | schedules.view |
| GET | /clinics/{clinic}/appointments?branch_id&doctor_id&status&from&to&q, /appointments/{id} | appointments.view |
| POST | /clinics/{clinic}/appointments `{doctor_id, service_id, starts_at, patient_email, patient_name?, patient_phone?}` | appointments.book |
| POST | /clinics/{clinic}/appointments/{id}/confirm|reject|complete|no-show|cancel | appointments.manage |
| GET | /clinics/{clinic}/reports?from&to | reports.view |
| GET | /clinics/{clinic}/urgent-availability → `{doctors: (AvailableDoctor & {available_now, affiliated_branch})[], volunteers_total}` (affiliated opted-in volunteers only) | schedules.view |

Clinic roles: **owner** (all), **manager** (branches, doctors, appointments, schedules, reports),
**receptionist** (view/book/manage appointments, view schedules).

### Urgent consultation (spec 002; contract: `specs/002-urgent-live-consultation/contracts/urgent-v2.md`)
`GET /urgent/available-doctors` (public) → `{count, doctors}`; each `AvailableDoctor` is
`{id, name, title_ar, title_en, avatar_url, rating_avg, rating_count, specialties[{id,slug,name_ar,name_en}],
modes[online|in_person], city{name_ar,name_en}|null, available_until, load{active,max}}` — public fields only.

`POST /urgent-requests` 🔐 (throttle `urgent`: 3/min per user + `URGENT_IP_RATE_LIMIT`/hour per IP, default 10)
```json
{ "severity": "critical", "preferred_doctor_id": null, "consent": true,
  "specialty_id": "01j…", "description": "High fever since last night", "consultation_type": "online",
  "governorate_id": "01j…", "city_id": "01j…", "location_details": null, "contact_phone": "01012345678" }
```
→ 201 UrgentRequest · 409 `urgent_open_exists` · 429 `rate_limited` · 422 `preferred_doctor_unavailable`.
`life_threatening` and `disclaimer_acknowledged` are no longer accepted (ignored if sent). There is no
emergency-number response: every severity is routed to live doctors.

UrgentRequest fields added in v2: `severity`, `keep_open_until`, `preferred_doctor{id,name}|null`, `outcome_note`
(patient / accepted doctor / admin only), `time_to_accept_seconds`, `waiting_seconds` (while matching),
`unread_messages` (for the viewer; 0 for non-participants), and for doctors `directed_to_me`.

Messages (participants only — the patient owner or the accepted doctor; anyone else 404):
- `GET /urgent-requests/{id}/messages?after_id=<int>` → `Message[]` oldest first (≤200 per call);
  409 `not_accepted` before acceptance; readable after close. Advances the viewer's read marker.
- `POST /urgent-requests/{id}/messages` `{body: 1..1000}` → 201 Message; 409 `not_accepted` / `closed`;
  30/min.
- `Message = {id, body, sender: patient|doctor, mine, created_at}`.

Statuses: `searching → notifying → accepted → in_progress → completed`, or `unmatched | cancelled | expired`;
`waiting` = nobody available / nobody accepted yet, kept open until `keep_open_until` (submission +
`urgent_wait_max_minutes`; `null` when waiting is disabled). `POST /urgent-requests` with nobody eligible
returns 201 `waiting`. `waiting → notifying` as soon as a doctor becomes available (and back to `waiting`
if they do not accept in time); `waiting | notifying → unmatched` at `keep_open_until`. A waiting request
counts as open (409 `urgent_open_exists`), can be cancelled, and can still be accepted by doctors notified
earlier. Patient notification kinds: `urgent.waiting`, `urgent.redispatched`, `urgent.accepted`,
`urgent.unmatched`.
Doctors who were dispatched but haven't won see no patient name, phone, area or location details.

### Admin 🛡 (`admin.access` + specific permission)
| GET /admin/stats?from&to · GET /admin/reports/appointments?group_by=day|specialty|clinic (reports.view) |
|---|
| GET /admin/users?q&role&status · PUT /admin/users/{id}/status `{status, reason}` (users.manage) |
| GET /admin/doctors?verification_status&q · GET /admin/doctors/{id} · POST /admin/doctors/{id}/approve|reject|suspend|reinstate `{notes}` · GET …/documents/{doc}/download (doctors.verify; audited) |
| GET/POST/PUT/DELETE /admin/specialties (specialties.manage) |
| GET /admin/clinics · PUT /admin/clinics/{id}/status (clinics.manage) |
| GET /admin/appointments · POST /admin/appointments/{id}/cancel `{reason}` (appointments.oversee) |
| GET /admin/urgent-requests?status&flagged · GET /admin/urgent-requests/{id} (urgent.oversee; audited) |
| GET /admin/urgent/live (urgent.oversee) → `{available_doctors, open{critical,urgent,standard}, oldest_waiting_seconds, avg_time_to_accept_seconds_today (null if none), unmatched_last_24h, flagged_open, doctors: AvailableDoctor[], open_requests: UrgentRequest(admin)[] (≤50, severity then oldest)}` |
| GET /admin/reviews?status&reported · POST /admin/reviews/{id}/hide|restore · GET /admin/review-reports · POST /admin/review-reports/{id}/resolve|dismiss (reviews.moderate) |
| GET /admin/audit-logs?action&actor_id&subject_id&from&to (audit.view) |
| GET/PUT /admin/settings (settings.manage): emergency_number (stored only; not used by any urgent screen or text), urgent_enabled, pending_hold_minutes, urgent_tier{1,2,3}_timeout_seconds, urgent_critical_timeout_seconds (15–600, 90), urgent_directed_timeout_seconds (15–600, 45), urgent_wait_max_minutes (0–120, 30; 0 = no waiting), urgent_requests_per_hour, urgent_location_retention_hours, reminder_hours_before |

## Example: book → conflict
```http
POST /api/v1/appointments
{"doctor_id":"01m7…","service_id":"01m7…","starts_at":"2026-11-17T08:20:00+00:00"}

201 {"success":true,"message":"Appointment booked successfully","data":{"id":"01m7…","reference":"MB-7KQ2X9C","status":"confirmed","starts_at":"2026-11-17T08:20:00+00:00","ends_at":"2026-11-17T08:40:00+00:00","price":400,"currency":"EGP",…}}

(same request by another patient)
409 {"success":false,"message":"The selected appointment is no longer available","code":"booking_conflict","errors":{"starts_at":["The selected appointment is no longer available"]}}
```

## Real-time (optional)
Private channels (authorized in `routes/channels.php`): `App.Models.User.{id}`, `urgent-request.{id}`
(patient owner + dispatched doctors). Event `urgent.updated` carries `{id, status, tier}` only.
Clients must re-fetch the resource; polling every few seconds is the supported baseline.
