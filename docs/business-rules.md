# Business Rules

## Booking workflow
1. Patient picks specialty → doctor → profile → service (branch or online) → date.
2. `GET /doctors/{id}/availability` returns a **snapshot** of free slots from the scheduling engine.
3. Patient confirms; the backend **revalidates** the exact slot inside a transaction with a row lock
   on the doctor, then inserts. The DB exclusion constraint is the final guard. Losers get **409**.
4. Instant-booking doctors → `confirmed`. Manual-confirmation doctors → `pending_confirmation`
   with a hold (`pending_hold_minutes`, default 60, never beyond the start time). The pending
   request blocks the period until confirmed, rejected, cancelled or **expired** (system).
5. Notifications to patient, doctor and clinic staff are sent after commit (queued).

Rules: only verified + active doctors with active accounts that accept bookings; the service must
belong to the doctor, be active, and (in person) be at an active branch of an active clinic the
doctor is affiliated with; a doctor cannot book themselves. A patient may hold overlapping
appointments with different doctors (not blocked).

## Scheduling rules (availability engine)
- Weekly windows per doctor **per location** (branch, or `null` = online), each with breaks.
- Exceptions per date: `closed` (holiday/leave; doctor-wide or one branch) or `custom_hours`
  (replaces that day's weekly windows). A doctor-wide closure always wins.
- Slot length = **service duration** (5–240 min, per service). Grid step = duration + doctor
  **buffer** (0–120). After a break or an existing appointment the grid restarts where it ends.
- A slot is offered only if: inside a window; not overlapping a break; `start ≥ now + lead time`;
  local date within `horizon_days`; `[start, end + buffer)` doesn't overlap any blocking appointment
  of that doctor **at any location**.
- Computed dynamically; nothing pre-generated. Times are interpreted in the doctor's timezone
  (Africa/Cairo, DST-aware) and stored in UTC.
- Changing schedules/prices never changes existing appointments (period and price are snapshotted).

## Appointment states

| From | Allowed to | Who |
|---|---|---|
| pending_confirmation | confirmed, rejected (reason) | doctor; clinic staff with manage permission |
| pending_confirmation | expired | system (hold passed) |
| pending_confirmation / confirmed | cancelled_by_patient | patient (owner) |
| pending_confirmation / confirmed | cancelled_by_doctor (reason) | doctor (owner) |
| pending_confirmation / confirmed | cancelled_by_clinic (reason) | clinic staff (own clinic) |
| pending_confirmation / confirmed | cancelled_by_admin (reason) | admin |
| confirmed | completed, no_show (only after start) | doctor; clinic staff |
| completed, rejected, expired, no_show, cancelled_* | — (terminal) | — |

Every transition writes `appointment_status_histories` (from, to, actor, actor role, reason, time).
Records are never deleted.

## Cancellation policy
- Patient: a **confirmed** appointment can be cancelled only ≥ `min_cancellation_hours` (doctor
  setting, default 12 h) before it starts; pending requests can be withdrawn any time before start.
- Doctor / clinic / admin cancellations require a reason; nobody but an admin can cancel after start.
- Cancellation records who, why, when, previous and resulting status.

## Rescheduling
One transaction: lock doctor → cancel original (`cancelled_by_patient`, reason `rescheduled`, policy
applies) → book the new slot with full revalidation (new appointment links `rescheduled_from_id`).
Any failure rolls back everything: the original appointment stays intact.

## Reviews
One review (1–5, optional comment) per **completed** appointment, by its patient. Ratings are
recomputed from published reviews. Anyone signed in may report a review once; admins hide/restore
(hidden reviews leave the average). Public review lists show first name + last initial.

## Doctor verification
`draft|rejected → pending` (doctor submits; requires license number, ≥1 specialty, a license
document) → `approved|rejected` (admin; rejection needs notes) ; `approved → suspended → approved`.
Admins cannot review their own profile. License number is locked while pending/approved/suspended.
Only `approved` + active doctors with active accounts are public, bookable, or eligible for urgent requests.

## Volunteer eligibility ("available now")
A doctor is available now only if: publicly visible (verified) **and** explicitly opted in (status
active) **and** has a **current availability window** for a mode they accept **and** active urgent
workload < `max_concurrent_requests`. One query (`VolunteerMatcher::availableNow()`) defines this and
is reused by the public list, the admin live board, the clinic view and dispatching. Dispatching
additionally requires the request's mode and "not already dispatched / not the patient".
Windows: "now" (1–12 h), "tonight" (20:00–08:00 local), or scheduled (≤ 24 h). They end on their own.

## Urgent consultation lifecycle (spec 002 — live consultation, no emergency-number redirect)
1. The patient sees the live list of doctors available now (`GET /urgent/available-doctors`) and
   either picks one (**directed**) or broadcasts. Every severity — including **critical** — is
   routed to live doctors; the platform never redirects the patient to an external number instead.
   Severity is self-reported and never presented as a diagnosis.
2. The patient chooses severity (`critical | urgent | standard`), consents to minimal data sharing
   (consent recorded), gives description, consultation type, governorate/city, contact phone
   (+ location details for in-person). A preferred doctor who is not available right now → 422
   `preferred_doctor_unavailable` and nothing is created.
3. Limits: one open request per patient (a waiting request counts); `urgent_requests_per_hour` (default 3) + route throttling.
4. Dispatch steps (empty steps are skipped immediately; each step runs once):
   - **0 directed** (only when a doctor was picked): only that doctor, still subject to every
     eligibility rule. Wait `urgent_directed_timeout_seconds` (45). If the doctor declines or ends
     their availability, the fallback starts **immediately**; they can still accept while it is open.
   - **critical**: one wave to **all** eligible available doctors — any specialty incl. GPs; online
     nationwide, in person same governorate — then finalize after `urgent_critical_timeout_seconds` (90).
   - **urgent / standard**: 1. requested specialty, same city — wait `urgent_tier1_timeout_seconds` (60);
     2. requested specialty, same governorate (online: anywhere) — tier2 (90); 3. general
     practitioners (disclosed to the patient) — tier3 (60).
   If nobody is eligible and no doctor still holds a notification, the request does not wait for a
   timeout: it goes straight to step 5.
5. **Keep-open (`waiting`)**: when nobody is eligible, or nobody accepted before the last step timed
   out, the request stays open until `keep_open_until` = submission + `urgent_wait_max_minutes`
   (default 30, 0 disables; stored on the request, so later settings changes do not move it). The
   patient is told honestly that no doctor is available right now and until when the request is kept
   open; they can cancel or book a regular appointment. Doctors notified earlier keep the request and
   may still accept. As soon as a doctor may have become available — saves their volunteer profile,
   starts an availability window, completes a consultation or has one cancelled, or (within a minute,
   via the sweeper) a scheduled window starts — every waiting request, critical first then oldest,
   gets a new matching round with the same steps and eligibility (doctors already dispatched for a
   request are not notified again); the patient is notified when a doctor is reached. An unanswered
   round returns to `waiting`. At `keep_open_until` the request becomes `unmatched` (hard bound, even
   mid-round): the patient is told honestly no doctor accepted and offered to retry or book a regular
   appointment. With waiting disabled, `unmatched` happens at once.
6. Doctors see open requests ordered by severity (critical first) then longest waiting, with
   `directed_to_me` and `waiting_seconds`. **First acceptance wins atomically**; others get 409 and a
   "taken" notification. The patient receives the doctor's details; `time_to_accept_seconds` is recorded.
7. After acceptance the patient and the accepted doctor exchange text messages (≤ 1000 chars,
   30/min) inside the request; sending stops when the request closes (history stays readable).
8. `accepted → in_progress → completed` by the accepted doctor, optionally with an outcome note
   (≤ 2000 chars, visible to the patient, the doctor and admins); patient may cancel until completion.
9. Privacy: undispatched doctors get 404; dispatched doctors see only specialty, description,
   type, governorate/city until they win; every doctor access is audit-logged; location details are
   cleared on close and after `urgent_location_retention_hours`. Doctors can flag abuse (admins alerted).
10. Timeouts are operational settings, not guarantees (the UI shows live counts and real waiting
    time). A per-minute sweeper finalizes overdue requests if jobs are lost (keeping them open while
    their deadline is ahead), retries waiting requests and closes them at the deadline.
11. Admins see a live board (available doctors, open requests by severity, oldest wait, average
    time-to-accept today, unmatched in 24 h, flagged); clinics see which affiliated doctors are
    volunteers and who is available now (read-only).

## Clinics (tenants)
Owner creates the organization (becomes owner). Staff are invited by email (existing accounts) and
must accept. Roles: owner / manager / receptionist (see API docs). Suspending a membership removes
access immediately. Ending a doctor affiliation deactivates their services and schedules at that
branch. Reception can book on behalf of a patient (new patients get an account and set their own
password via the reset link).
