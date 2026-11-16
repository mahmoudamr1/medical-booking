# Feature Specification: Medical Booking Platform

**Feature Branch**: `main`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Healthcare appointment booking & medical services marketplace for Egypt
(CliniDo-style) with patients, independent doctors, clinics with branches and staff, volunteer
doctors for urgent (non-emergency) assistance, and platform administrators. Full SRS in
`claude/plan.md`."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Patient finds a verified doctor and books a real slot (Priority: P1)

A patient (or guest who then signs in) searches by specialty, name, location, price, rating, and
date; opens a verified doctor's profile; picks a branch, service, date and an available time; and
confirms. The booking is created only if the period is still free at confirmation time. Patient
and doctor are notified.

**Why this priority**: This is the core value of the marketplace; everything else supports it.

**Independent Test**: Seed one verified doctor with a schedule; a patient searches, books a slot,
and sees it under "Upcoming"; the slot is no longer offered to anyone else.

**Acceptance Scenarios**:

1. **Given** a verified, active doctor with working hours tomorrow 10:00–13:00 and a 20-minute
   service, **When** a patient requests availability for tomorrow, **Then** slots 10:00, 10:20 …
   12:40 are returned, excluding breaks, past times, and existing appointments.
2. **Given** two patients submit bookings for overlapping periods with the same doctor at the same
   moment, **When** both requests are processed, **Then** exactly one succeeds and the other gets
   a conflict response; no duplicate active appointment exists.
3. **Given** an unverified or suspended doctor, **When** anyone searches, **Then** that doctor
   never appears and cannot be booked.
4. **Given** a guest, **When** they try to confirm a booking, **Then** they are asked to sign in.

---

### User Story 2 - Patient manages appointments (Priority: P1)

The patient sees appointments grouped as upcoming, pending, completed, and cancelled, with
reference, doctor, specialty, clinic, date, start/end, type, price, status, and creation time. They
can cancel within the cancellation policy and reschedule atomically.

**Why this priority**: Booking without self-service management creates support load and no-shows.

**Independent Test**: Book, cancel (inside and outside the notice window), reschedule to a free
slot and to a taken slot; verify the original survives a failed reschedule.

**Acceptance Scenarios**:

1. **Given** a confirmed appointment 48h away and a 24h minimum notice, **When** the patient
   cancels, **Then** status becomes `cancelled_by_patient`, the reason/actor/time are recorded, the
   period is released, and the record is kept.
2. **Given** an appointment 2h away and 24h notice, **When** the patient cancels, **Then** the
   request is refused with a policy explanation.
3. **Given** a reschedule to an already occupied period, **When** submitted, **Then** it fails with
   a conflict and the original appointment remains unchanged.

---

### User Story 3 - Doctor runs their practice (Priority: P1)

A doctor completes their profile, submits verification documents, configures services (duration,
price, type) per branch, weekly hours, breaks, exceptions/holidays, buffer, lead time, horizon,
instant vs manual confirmation, and minimum cancellation notice; sees today/upcoming/pending
counts and a day/week/month calendar; confirms, rejects, completes, or marks no-show.

**Why this priority**: Without doctors managing real schedules there is no inventory to book.

**Independent Test**: Doctor sets hours + break, a patient books, doctor sees it on the calendar,
confirms (manual mode) and later completes it.

**Acceptance Scenarios**:

1. **Given** manual confirmation enabled, **When** a patient books, **Then** the appointment is
   `pending_confirmation` and still blocks the period.
2. **Given** a doctor tries to confirm another doctor's appointment, **Then** it is forbidden.
3. **Given** a completed appointment, **When** anyone tries to set it to pending, **Then** the
   transition is rejected.

---

### User Story 4 - Admin verifies doctors and governs the platform (Priority: P2)

Administrators review verification applications (with private documents), approve/reject/
suspend doctors, manage users, specialties, clinics, appointments oversight, review moderation,
urgent-request oversight, settings, reports, and audit logs. Statistics come from real data.

**Why this priority**: Verification gates public discovery; admin is required for trust.

**Independent Test**: A new doctor registers, is invisible publicly, admin approves, doctor
appears in search; the approval is in the audit log.

**Acceptance Scenarios**:

1. **Given** a pending doctor, **When** the admin approves, **Then** the doctor becomes publicly
   discoverable, is notified, and an audit entry records actor, action, and time.
2. **Given** a non-admin, **When** they call any admin endpoint, **Then** access is denied.

---

### User Story 5 - Clinic organizations manage branches, staff, and doctors (Priority: P2)

A clinic owner creates the organization, branches (address, hours, services), invites staff with
roles (manager, receptionist), affiliates doctors, views/manages organization appointments, and
sees reports. Receptionists can book on behalf of patients and confirm/cancel where permitted.

**Why this priority**: Multi-doctor organizations are a key market segment.

**Independent Test**: Two clinics with staff; staff of clinic A cannot read or change anything of
clinic B by changing identifiers.

**Acceptance Scenarios**:

1. **Given** a receptionist of clinic A, **When** they request an appointment of clinic B,
   **Then** they receive 404 and no data leaks.
2. **Given** a receptionist with booking permission, **When** they book for a patient at their
   branch, **Then** the appointment is created with the same overlap protection as patient bookings.

---

### User Story 6 - Urgent (non-emergency) assistance via volunteer doctors (Priority: P2)

A patient opens urgent assistance, reads when it is appropriate, acknowledges it is not an
ambulance service, optionally picks a specialty, writes a brief description, picks consultation
type, gives location, and consents to sharing. Eligible volunteer doctors (verified, active,
opted-in, currently available, matching specialty/area/mode, under workload limit) are notified in
escalating groups. The first acceptance wins; others get a conflict. If nobody accepts in time,
the request is `unmatched` and the patient is shown regular booking alternatives and the
emergency warning. Life-threatening indications show the emergency warning and number (123)
immediately and are not routed to matching.

**Why this priority**: Distinguishing feature, but depends on doctors and verification.

**Independent Test**: Two volunteer doctors receive one request and accept simultaneously; exactly
one wins. A request with no eligible volunteers ends `unmatched`.

**Acceptance Scenarios**:

1. **Given** two notified volunteers, **When** both accept at once, **Then** one gets success and
   the other a conflict; exactly one winning dispatch is stored.
2. **Given** a notified (not accepted) doctor, **When** they view the request, **Then** patient
   phone and exact location are hidden.
3. **Given** the patient marks the situation as life-threatening, **Then** the emergency warning and
   number are shown and no volunteer matching starts.
4. **Given** a volunteer whose "available now" window has passed, **Then** they are not matched.

---

### User Story 7 - Reviews after completed visits (Priority: P3)

After a completed appointment the patient may leave one rating (1–5) with optional comment.
Doctor averages update. Anyone can report a review; admins moderate (hide/restore).

**Independent Test**: Review allowed once for completed visit; refused for non-completed or a
second time; hidden review excluded from average.

**Acceptance Scenarios**:

1. **Given** a cancelled appointment, **When** the patient reviews, **Then** it is refused.
2. **Given** an already-reviewed appointment, **When** reviewed again, **Then** it is refused.

---

### User Story 8 - Bilingual, accessible, responsive experience (Priority: P3)

Arabic (RTL) is default; English (LTR) is switchable everywhere; dates/numbers are localized;
every screen works on mobile; every async view has loading, empty, error/retry, and success states.

**Independent Test**: Switch language on home, search, profile, booking, dashboards; layout
direction and text change; mobile viewport renders without horizontal scroll.

### Edge Cases

- Booking a slot that became past between display and confirmation → refused (validation/conflict).
- Doctor changes schedule after bookings exist → existing appointments are kept; only new
  availability changes.
- Service duration longer than remaining window before a break → that start time is not offered.
- Appointment spanning midnight or DST changes → all periods computed in Africa/Cairo with
  explicit timezone and stored as timestamps with time zone.
- Pending manual-confirmation booking not acted on before its hold expiry → becomes `expired` and
  stops blocking.
- Doctor with booking temporarily closed → no slots generated; direct booking refused.
- Patient tries to book two overlapping appointments with different doctors → allowed (spec only
  forbids doctor-side overlap) but the UI warns. *(assumption)*
- Volunteer acceptance after request was cancelled/expired → conflict.
- Rate limit exceeded on login or urgent request creation → 429.
- File upload with spoofed extension → rejected by actual MIME check.

## Requirements *(mandatory)*

### Functional Requirements

**Identity & access**
- **FR-001**: Users MUST register/login with email + password; passwords hashed; sessions via
  secure HTTP-only cookies with CSRF protection; logout invalidates the session.
- **FR-002**: System MUST support password reset and email verification (delivered when mail is
  configured; logged locally otherwise).
- **FR-003**: Users MAY hold multiple roles (patient, doctor, clinic_owner, clinic_manager,
  receptionist, admin); permissions are granted via roles; clinic roles are scoped per clinic.
- **FR-004**: Login and urgent-request creation MUST be rate-limited.

**Directory**
- **FR-010**: Specialties MUST have Arabic/English names, description, icon, active flag, order,
  and unique slug; managed by admins only.
- **FR-011**: Public doctor search MUST filter server-side by name, specialty, governorate, city,
  area, clinic, price range, minimum rating, available date, consultation type, and return
  paginated results with next available slot; only verified + active doctors are returned.
- **FR-012**: Doctor public profile MUST show professional data, specialties, clinics/branches,
  services with prices/durations, ratings/reviews, and verification badge, and MUST NOT expose
  private verification data.
- **FR-013**: Clinic directory MUST list active clinics with search, location filter, branches,
  affiliated doctors, services, and contact info.
- **FR-014**: Name search MUST tolerate partial input and common Arabic letter variants.

**Scheduling & booking**
- **FR-020**: Doctors MUST configure per-branch weekly schedules (day, start, end), breaks,
  exceptions (closed day or custom hours), buffer minutes, lead time, booking horizon, booking
  open/closed, instant vs manual confirmation, and minimum cancellation notice.
- **FR-021**: Services MUST define duration and non-negative price per doctor and branch.
- **FR-022**: Availability MUST be computed dynamically, excluding past, outside-hours, breaks,
  exceptions, occupied periods (+buffer), periods shorter than the service duration, and outside
  lead-time/horizon.
- **FR-023**: Booking MUST revalidate availability server-side inside a transaction, and the
  database MUST prevent overlapping active appointments per doctor; conflicts return 409.
- **FR-024**: Appointment statuses MUST be `pending_confirmation`, `confirmed`, `completed`,
  `cancelled_by_patient`, `cancelled_by_doctor`, `cancelled_by_clinic`, `cancelled_by_admin`,
  `rejected`, `expired`, `no_show` with an explicit allowed-transition table.
- **FR-025**: Cancellation MUST record actor, reason, time, previous and resulting status; records
  are never deleted.
- **FR-026**: Rescheduling MUST secure the new period before releasing the old one atomically; on
  failure the original is unchanged.
- **FR-027**: Every appointment transition MUST be recorded in a status history with actor + time.
- **FR-028**: Pending confirmations MUST expire automatically after a configurable hold window.

**Clinics**
- **FR-030**: Clinic owners MUST manage organization details, branches (address, hours, services),
  staff memberships with roles, and doctor affiliations.
- **FR-031**: All clinic management data access MUST be scoped to the user's organization(s).

**Urgent assistance**
- **FR-040**: Doctors MUST explicitly opt in to volunteering, with specialties, locations, modes,
  max concurrent requests, and time-bounded availability windows that auto-expire.
- **FR-041**: Urgent requests MUST require acknowledgement of the not-an-ambulance disclaimer and
  consent; MUST show the emergency warning + configurable number for life-threatening indication
  and not start matching in that case.
- **FR-042**: Matching MUST dispatch in escalating groups (same specialty + same area → same
  specialty wider area → general practitioners with disclosure) with configurable timeouts.
- **FR-043**: Acceptance MUST be atomic: exactly one doctor wins; others receive 409.
- **FR-044**: Patient contact details and exact location MUST be revealed only to the accepted
  doctor; each doctor's access to a request is logged.
- **FR-045**: Unmatched requests MUST end in `unmatched` and present regular booking alternatives
  plus the emergency reminder. Statuses: created, searching, notifying, accepted, in_progress,
  completed, cancelled, unmatched, expired.

**Reviews, notifications, admin**
- **FR-050**: One review per completed appointment by its patient; averages maintained; reports
  and moderation supported.
- **FR-060**: Notifications MUST be persisted in the database and delivered by email when
  configured, for the events listed in the SRS §17; slow delivery runs after commit via queue.
- **FR-061**: Real-time updates SHOULD be pushed when configured; the UI MUST work by polling
  persistent state when real-time is unavailable.
- **FR-070**: Admin dashboard MUST show live statistics (patients, doctors, verified, pending
  verification, clinics, appointments by state, open/unmatched urgent requests) with date filters.
- **FR-071**: Critical admin actions and sensitive data access MUST be audit-logged.
- **FR-072**: Admins MUST manage platform settings (cancellation hold window, urgent timeouts,
  emergency number).

**Files & privacy**
- **FR-080**: Verification documents MUST be PDF/JPEG/PNG ≤ 5 MB, MIME-checked, stored privately
  with generated names, and downloadable only by the owner doctor and admins.
- **FR-081**: Consent records MUST be stored for urgent data sharing and patient preferences.

**Experience**
- **FR-090**: UI MUST support Arabic RTL (default) and English LTR, responsive layouts, and
  loading/empty/error/success states on every async screen.

### Key Entities

- **User / Role / Permission**: account identity; many-to-many roles; permissions per role.
- **Patient profile / Doctor profile**: role-specific data; doctor has verification status,
  booking preferences, and private documents.
- **Specialty**: bilingual directory entry; doctors have many.
- **Clinic / Branch / Membership / Affiliation**: tenant organization, its locations, its staff
  (with clinic role), and doctors linked to branches.
- **Medical service**: bookable offering (doctor + optional branch, type, duration, price).
- **Schedule / Break / Exception**: weekly working rules and deviations per doctor-branch.
- **Appointment / Status history**: booked period with status and full transition trail.
- **Review / Review report**: patient feedback on completed visit and moderation reports.
- **Volunteer profile / specialties / locations / availability windows**: opt-in urgent supply.
- **Urgent request / Dispatch**: patient urgent need and per-doctor notification attempts.
- **Notification, Audit log, Consent, Platform setting**: cross-cutting records.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Under 20 simultaneous booking attempts for the same period, exactly 1 succeeds and
  19 receive a conflict, across repeated runs.
- **SC-002**: Under simultaneous acceptance by 2+ volunteers, exactly 1 acceptance is recorded.
- **SC-003**: 0 cross-tenant reads or writes succeed in automated isolation tests.
- **SC-004**: 0 unverified/suspended doctors appear in any public listing or urgent dispatch.
- **SC-005**: A patient can go from home page to confirmed booking in ≤ 6 interactions.
- **SC-006**: Doctor search returns the first page in under 500 ms on seeded data (≥ 1,000
  doctors) on a developer machine.
- **SC-007**: All public, patient, doctor, clinic, admin, and urgent screens render correctly in
  both Arabic RTL and English LTR at 375 px and desktop widths.
- **SC-008**: Full backend test suite and frontend build pass from a clean database.

## Assumptions

- Academic/demonstration deployment with synthetic data only; legal review for production is out
  of scope and documented as a blocker for real-patient use.
- Payments are out of scope: price is displayed and recorded, paid at the clinic.
- SMS/WhatsApp delivery is out of scope (no free provider); notification channels are database +
  email (mail driver `log` locally) + real-time when configured.
- Patients may hold overlapping appointments with different doctors (warned, not blocked).
- "Life-threatening" is a patient self-declaration via a checkbox and a list of red-flag symptoms;
  no automated triage.
- Default policy values: hold window 15 min for pending confirmation, min cancellation notice
  per doctor (default 12 h), lead time 60 min, horizon 60 days, urgent group timeouts 60/90/60 s.
- Geography uses a seeded Governorate → City → Area hierarchy for Egypt; distance radius matching
  uses area/city/governorate tiers rather than GPS.
- Local development runs without Docker using a portable toolchain (`scripts/setup-toolchain.sh`);
  docker-compose is provided for environments that have Docker.
