# Feature Specification: Live Urgent Consultation

**Feature Branch**: `main` | **Created**: 2026-11-16 | **Status**: Draft
**Supersedes**: FR-041 (emergency-number gate) and the "life-threatening → no request" rule of spec 001.
**Input**: "For urgent cases build a section that connects patients with doctors available right now.
Drop the 123 number entirely — this is for someone who needs an urgent consultation that may save their
life, not a redirect to the ambulance. Set it up properly with its controls across all systems and roles."

## User Scenarios & Testing

### US1 — Patient sees who is available now and gets connected fast (P1)
A patient (or guest who then signs in) opens **Urgent consultation**, sees a live list of verified doctors
available right now (name, title, specialties, avatar, rating, online/in-person, city, current load), and
either **requests a specific doctor** or **broadcasts** to everyone suitable. They choose a severity
(critical / urgent / standard), describe the problem, consultation type, location and phone, and consent.
**Acceptance**:
1. Given 3 doctors are available now, the list shows exactly those 3 (expired windows or full-load doctors
   are not shown) with a live count.
2. Given severity **critical**, all eligible available doctors (any specialty, GP included, nationwide for
   online) are notified **immediately in one wave**; no tiers are skipped by waiting.
3. Given the patient picked a specific doctor, that doctor is notified first; if they decline or don't respond
   within the directed timeout, the request falls back to a broadcast automatically.
4. No screen shows or redirects to an emergency phone number.

### US2 — Doctor responds and consults (P1)
Available doctors get an incoming-request alert ordered by severity and waiting time, accept atomically
(first wins), then see the patient's contact and location, exchange messages with the patient inside the
request, start and complete the consultation, and can add a short outcome note.
**Acceptance**: two doctors accepting at once → one wins (existing guarantee); messages are visible only to
the patient and the accepted doctor; before acceptance a doctor sees no name, phone or exact location.

### US3 — Patient follows the consultation live (P1)
After acceptance the patient sees the doctor's details and a message thread, with status updates
(polling; real-time when configured). The patient can cancel any time before completion.

### US6 — Keep the request open when no doctor is available (P1)
When no doctor is eligible right now, or nobody accepts before the last dispatch step times out, the
request is **not** closed straight away: it becomes `waiting` and stays open until `keep_open_until`
(submission + `urgent_wait_max_minutes`, default 30). The patient is told honestly that no doctor is
available right now and until when the request is kept open; they can cancel any time or book a regular
appointment. As soon as an eligible doctor becomes available (opts in, starts an availability window,
frees capacity by completing a consultation or by a cancelled one, or a scheduled window starts), the
request is dispatched to them immediately and the patient is notified.
**Acceptance**:
1. Given no eligible doctor, when the patient submits, the response is 201 with `status = waiting` and
   `keep_open_until` set; the patient is notified (`urgent.waiting`) — no false promise of a response.
2. Given a waiting request, when a matching doctor starts an availability window, that doctor is
   notified of the request at once (redacted as usual), the request becomes `notifying`, and the patient
   is notified (`urgent.redispatched`); when the doctor accepts, the patient is notified (`urgent.accepted`).
3. Given a doctor at max workload completes their consultation, waiting requests they are eligible for
   are dispatched to them immediately.
4. Given a re-dispatched request nobody accepts before its last step times out, it returns to `waiting`
   (if `keep_open_until` has not passed).
5. Given `keep_open_until` passes without an acceptance, the request becomes `unmatched` with the honest
   "no doctor accepted" message (job at the deadline; the sweeper is the safety net).
6. Given a waiting request, the patient can cancel it; the one-open-request rule counts waiting requests.
7. Given `urgent_wait_max_minutes = 0`, the previous behaviour applies (unmatched immediately / after
   the last step).

### US4 — Admin controls and monitors (P2)
Admins see a **live board**: doctors available now, open requests by severity, oldest waiting time,
average time-to-accept today, unmatched in the last 24 h, flagged requests. Admins can enable/disable the
service and tune timeouts per severity and the directed-request timeout, and per-patient limits.

### US5 — Clinics see their doctors' urgent availability (P3)
Clinic owners/managers see which of their affiliated doctors are currently available for urgent
consultations (read-only).

### Edge cases
- No doctor available now → the patient is told honestly ("no doctor is available right now"); the request
  stays open (`waiting`) until `keep_open_until` and is dispatched as soon as a doctor becomes available;
  the patient can cancel it or book a regular appointment (US6).
- Doctors notified in an earlier step who did not answer keep their notification while the request is
  waiting (they may still accept; first acceptance still wins atomically). Doctors already dispatched for
  a request (including declines and a released directed doctor) are not notified again for it.
- A request re-dispatched near its deadline is still closed at `keep_open_until` (hard bound, no
  open-ended waiting).
- Settings changes do not move the deadline of requests already waiting (`keep_open_until` is stored).
- Directed doctor goes unavailable while waiting → immediate fallback broadcast.
- Patient sends messages before acceptance → rejected (409); after close → rejected.
- Doctor at max load → not listed and not dispatched.
- Abuse: one open request per patient, hourly cap, doctor abuse reports (existing).

## Requirements
- **FR-201** Public endpoint listing currently available verified volunteer doctors with public fields only.
- **FR-202** `severity` (critical|urgent|standard) on every request; critical = single immediate wave to all
  eligible doctors; urgent/standard keep tiered escalation. Timeouts configurable per severity.
- **FR-203** Optional `preferred_doctor_id` → directed dispatch first, automatic broadcast fallback.
- **FR-204** Remove the life-threatening gate and the emergency number from the urgent flow, notifications
  and public settings payload used by urgent UI.
- **FR-205** In-request messaging between patient and accepted doctor (text, ≤ 1000 chars), persisted,
  participants-only, audit-logged access, rate limited.
- **FR-206** Doctor outcome note on completion (private to patient, doctor, admins).
- **FR-207** Admin live board endpoint and settings for severity timeouts / directed timeout.
- **FR-208** Clinic read-only view of affiliated doctors' current urgent availability.
- **FR-209** Metrics: time-to-accept per request; averages on the admin board.
- **FR-211** Keep-open: when matching finds nobody (or nobody accepts) the request becomes `waiting`
  until `keep_open_until` (submission + `urgent_wait_max_minutes`, 0–120, default 30; 0 disables).
  A doctor becoming available (opt-in, availability window, freed capacity, scheduled window start via
  the per-minute sweeper) triggers an immediate new matching round for waiting requests (critical first,
  then oldest) using the same `VolunteerMatcher` eligibility and `UrgentDispatcher` steps. The patient is
  notified on entering `waiting`, on re-dispatch and on acceptance; at the deadline → `unmatched`.
- **FR-210** All existing guarantees stay: atomic single acceptance, redaction before acceptance, consent,
  audit, rate limits, auto-expiring availability.

## Success Criteria
- **SC-201** With available doctors, a critical request reaches every eligible doctor in ≤ 2 s (one wave).
- **SC-202** Concurrency: exactly one acceptance under simultaneous accepts (existing test stays green).
- **SC-203** No urgent screen, notification or API response contains an emergency phone redirect.
- **SC-204** Patient ↔ doctor messages never visible to non-participants (tested).
- **SC-205** A waiting request reaches a doctor who becomes available within one queue round-trip of the
  availability change (≤ 60 s for scheduled windows via the sweeper) and never stays open past
  `keep_open_until` + 60 s.
