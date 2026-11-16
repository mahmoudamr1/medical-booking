# Urgent v2 API contract (authoritative for frontend + backend)

Envelope as in v1. All times ISO-8601 UTC.

## Public
`GET /api/v1/urgent/available-doctors?specialty=<slug|id>&governorate=<id>&mode=online|in_person`
→ 200 `{ data: { count: int, doctors: AvailableDoctor[] } }`
```ts
type AvailableDoctor = {
  id: string; name: string; title_ar: string|null; title_en: string|null; avatar_url: string|null;
  rating_avg: number; rating_count: number;
  specialties: { id: string; slug: string; name_ar: string; name_en: string }[];
  modes: ('online'|'in_person')[];            // what the doctor accepts now
  city: { name_ar: string; name_en: string } | null;   // coverage summary (first location)
  available_until: string;                     // end of current availability window
  load: { active: number; max: number };       // current urgent workload
}
```
Only verified, active, opted-in doctors with a CURRENT window and active < max.

## Patient (auth)
`POST /api/v1/urgent-requests`
```json
{ "severity": "critical|urgent|standard", "preferred_doctor_id": "ulid|null",
  "consent": true, "specialty_id": "ulid|null", "description": "10..1000",
  "consultation_type": "online|in_person", "governorate_id": "ulid", "city_id": "ulid|null",
  "area_id": "ulid|null", "location_details": "required if in_person", "contact_phone": "egypt mobile" }
```
(`life_threatening` and `disclaimer_acknowledged` are no longer accepted/required.)
→ 201 UrgentRequest. 409 `urgent_open_exists`; 429 `rate_limited`; 422 `preferred_doctor_unavailable`
when the chosen doctor is not currently available.

UrgentRequest adds: `severity`, `keep_open_until: string|null`, `preferred_doctor: {id,name}|null`, `outcome_note` (patient/accepted doctor/admin
only), `time_to_accept_seconds: int|null`, `unread_messages: int` (for the viewer).

`GET /api/v1/urgent-requests/{id}/messages?after_id=<int>` → 200 `{ data: Message[] }` (participants only:
patient owner or accepted doctor; 404 otherwise; 409 `not_accepted` before acceptance)
`POST /api/v1/urgent-requests/{id}/messages` `{ body: string(1..1000) }` → 201 Message
(409 `not_accepted` before acceptance, 409 `closed` after completion/cancel; throttled 30/min)
```ts
type Message = { id: number; body: string; sender: 'patient'|'doctor'; mine: boolean; created_at: string }
```

### Keep-open when no doctor is available (US6)
`status` gains `waiting`:
```ts
type UrgentStatus = 'searching'|'notifying'|'waiting'|'accepted'|'in_progress'|'completed'|'cancelled'|'unmatched'|'expired';
```
- `POST /urgent-requests` with nobody eligible → 201 with `status: "waiting"` (was `unmatched`).
- `waiting` = still open, nobody available/accepted yet; kept open until `keep_open_until`
  (submission + `urgent_wait_max_minutes`; `null` when the admin disabled waiting). While waiting,
  `expires_at === keep_open_until`.
- `waiting → notifying` as soon as a doctor becomes available (patient notification `urgent.redispatched`);
  `notifying → waiting` again if nobody accepts before the last step times out and the deadline is ahead;
  `waiting|notifying → unmatched` (`close_reason: "no_volunteer_accepted"`) at `keep_open_until`.
- A waiting request counts as open (409 `urgent_open_exists`), can be cancelled (`POST …/cancel` → 200),
  and can still be accepted by doctors notified earlier (doctor inbox `open` tab).
- Messages stay 409 `not_accepted` while waiting.
- New notification kinds (patient): `urgent.waiting` (no doctor available right now; kept open until the
  deadline), `urgent.redispatched` (a doctor became available and was notified). Payload as other urgent
  notifications: `{ urgent_request_id, status, severity }`.

## Doctor
`POST /api/v1/urgent-requests/{id}/complete` `{ outcome_note?: string(≤2000) }`
`GET /api/v1/doctor/urgent-requests` items include `severity`, `directed_to_me: boolean`, `waiting_seconds`.
Ordering: open requests by severity (critical first) then oldest first.
`meta.counts` gives the size of every inbox tab regardless of the `status` filter, so the UI needs one call:
```json
"meta": { "pagination": { … }, "counts": { "open": 2, "accepted": 1, "closed": 7 } }
```
`open` = still matching and awaiting this doctor's answer; `accepted` = this doctor's accepted/in-progress
consultations; `closed` = completed, cancelled, unmatched or expired requests that were dispatched to them.

## Admin
`GET /api/v1/admin/urgent/live` →
```json
{ "available_doctors": 12, "open": { "critical": 1, "urgent": 2, "standard": 0 },
  "oldest_waiting_seconds": 85, "avg_time_to_accept_seconds_today": 47,
  "unmatched_last_24h": 3, "flagged_open": 1,
  "doctors": AvailableDoctor[], "open_requests": UrgentRequest(admin view)[] }
```
Settings (GET/PUT /admin/settings) add `urgent_critical_timeout_seconds` (15–600, default 90),
`urgent_directed_timeout_seconds` (15–600, default 45) and `urgent_wait_max_minutes` (0–120, default 30;
0 = close as `unmatched` immediately, no waiting). `open` counts and `oldest_waiting_seconds` include
`waiting` requests. `emergency_number` remains a stored setting but is
not used by any urgent screen or text.

## Clinic (tenant, permission clinic.schedules.view)
`GET /api/v1/clinics/{clinic}/urgent-availability` → `{ data: { doctors: (AvailableDoctor & { affiliated_branch: {id,name_ar,name_en} })[], volunteers_total: int } }`
Lists the clinic's affiliated doctors who are opted-in volunteers, with `available_now: boolean` and `available_until`.

## Removed
- 422 `emergency` response and `emergency` payload.
- `urgent.emergency` texts and 123 mentions in notifications.
- `urgent.enabled` remains in `/settings/public`; `emergency_number` is removed from `/settings/public` and `/home`.
