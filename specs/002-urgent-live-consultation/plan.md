# Implementation Plan: Live Urgent Consultation

**Spec**: [spec.md](./spec.md) | **Constitution**: v2.0.0 (VII redefined, VIII clean code)

## Technical approach (backend owns the rules)
- **Data**: migration adds `urgent_requests.severity` (check: critical|urgent|standard, default urgent),
  `preferred_doctor_profile_id` (nullable FK), `outcome_note` (text, nullable); new table
  `urgent_request_messages` (id bigint, urgent_request_id FK cascade, sender_user_id FK, body ≤1000,
  created_at; index (urgent_request_id, id)).
- **Matching** (`VolunteerMatcher`): new method `availableNow()` (reused by the public list, the admin board
  and the clinic view — one query, no duplication) + `eligible()` extended with a `critical` wave
  (all specialties incl. GP; online = nationwide; in-person = same governorate) and a `directed` tier 0.
- **Dispatching** (`UrgentDispatcher`): tier 0 = preferred doctor (timeout `urgent_directed_timeout_seconds`);
  critical = one wave then finalize after `urgent_critical_timeout_seconds`; urgent/standard = existing tiers.
  Decline of the directed doctor triggers the next step immediately.
- **Actions**: `CreateUrgentRequest` drops the emergency gate and accepts severity / preferred doctor;
  `UrgentRequestActions::complete` accepts an outcome note; new `UrgentMessages` action (send/list with
  participant + status checks, audit on access).
- **Keep-open (US6, FR-211)**: new status `waiting` (part of `UrgentStatus::MATCHING` and `OPEN`, so
  accept / cancel / inbox / board / one-open rule work unchanged) and column `keep_open_until`
  (migration re-creates the status CHECK). `UrgentDispatcher` decides "close or wait" in one place:
  empty first round or `finalize()` before the deadline → `waiting` (`expires_at = keep_open_until`, a
  delayed finalize at the deadline); `matchWaiting()` re-runs `runTier(1)` for waiting requests
  (critical first, oldest first) — no parallel eligibility logic. Triggered by
  `MatchWaitingUrgentRequestsJob` after opt-in / new window (VolunteerController) and freed capacity
  (`UrgentRequestActions` complete / cancel of an accepted request), and every minute by `urgent:sweep`.
- **HTTP**: `GET /urgent/available-doctors` (public), `GET|POST /urgent-requests/{id}/messages`,
  `GET /admin/urgent/live`, `GET /clinics/{clinic}/urgent-availability` (tenant: schedules.view).
  Settings: add `urgent_critical_timeout_seconds`, `urgent_directed_timeout_seconds`; remove emergency number
  from urgent payloads and texts.
- **Frontend** (agents, by ownership): patient `/urgent` live doctors list + directed/broadcast request +
  severity + message thread (urgent-ui); doctor urgent page severity sorting + messages + outcome note
  (doctor-patient-ui); admin live board + settings (dashboards-ui); clinic availability card (dashboards-ui).

## Constitution check
I–VI unchanged and respected; VII as amended (live routing, redaction, audit, no fake guarantees);
VIII: single `availableNow()` query reused by three endpoints, one urgent API module + one types module
on the frontend, thin controllers, Larastan level 6 clean. PASS.
