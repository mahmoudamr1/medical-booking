# Security & Privacy

## Roles and permissions
Platform roles (table `roles`, many-to-many via `user_roles`): **patient**, **doctor**, **admin**.
Every account is a patient (one global patient account); doctors also hold `doctor`.
Permissions (`permissions`, `role_permissions`) — see `database/seeders/RolePermissionSeeder.php`:

| Role | Permissions |
|---|---|
| patient | appointments.book, appointments.view-own, reviews.create, urgent.request |
| doctor | doctor.profile.manage, doctor.schedule.manage, doctor.appointments.manage, doctor.verification.submit, volunteer.participate |
| admin | admin.access, users.manage, doctors.verify, specialties.manage, clinics.manage, appointments.oversee, reviews.moderate, urgent.oversee, audit.view, settings.manage, reports.view |

Clinic roles are **per tenant** (`clinic_memberships.role`): owner, manager, receptionist, mapped to
`App\Enums\ClinicPermission` in `App\Enums\ClinicRole`.

## Controls

| Area | Control |
|---|---|
| Authentication | Sanctum SPA session; HTTP-only, encrypted session cookie (`SESSION_ENCRYPT=true`); CSRF (`X-XSRF-TOKEN`); session regenerated on login, invalidated on logout; password change logs out other devices; bcrypt hashing; password policy ≥8 with letters+numbers |
| Brute force | `login` 5/min per email+IP and 20/min per IP; register 10/h/IP; password reset 3/min; global API 120/min |
| Account suspension | `active` middleware rejects suspended users on every request; admin suspension deletes their sessions |
| Authorization | Route middleware (`role`, `permission`, `tenant:<perm>`) **and** checks inside actions/policies (e.g. `TransitionAppointment` derives the actor's relationship to the appointment; `AppointmentPolicy`) |
| Tenant isolation | Clinic resolved only via active membership (404 otherwise); every sub-resource query scoped by `clinic_id`; tested for every clinic endpoint |
| Enumeration | ULID identifiers; unverified doctors / foreign clinics / undispatched urgent requests are indistinguishable from non-existent (404); forgot-password responds identically for unknown emails |
| Validation | Form Requests / validators on all input; DB constraints as the last line |
| File uploads | PDF/JPEG/PNG only, MIME sniffed from content, ≤5 MB, ≤10 files; server-generated names; private disk (`storage/app/private`), never a public URL; streamed with `nosniff` + `no-store`; owner-scoped; admin access audit-logged |
| Sensitive data | Patient contact shown only to the treating side; urgent requests redacted for non-accepted doctors; urgent outcome notes visible only to the patient, the accepted doctor and admins; the public available-doctors list exposes public profile fields only (no phone, email, license); review authors shown as first name + initial; `license_number`, verification notes hidden from public resources |
| Urgent messaging privacy | The patient ↔ doctor thread is readable/writable only by the patient owner and the accepted doctor: everyone else (other dispatched doctors, other patients, admins via the participant endpoints) gets 404 with no disclosure; no messages before acceptance (409 `not_accepted`), no new messages after close (409 `closed`); body ≤ 1000 chars, 30 sends/min; the real-time event carries status only; `unread_messages` is 0 for non-participants |
| Errors | Uniform envelope; no stack traces when `APP_DEBUG=false` |
| Audit | `audit_logs`: verification decisions, document views, user/clinic status changes, settings changes, specialty changes, clinic staff/doctor changes, admin cancellations, review moderation, urgent request views/acceptance/flags, urgent message reads by the doctor (`urgent.messages.viewed`, logged whenever a read returns messages; empty polls disclose nothing) |
| Abuse | Urgent: one open request per patient, per-hour cap, throttling (create, messages 30/min, public availability list 60/min), doctor abuse reports → admin alert |
| Data minimization | Urgent location details cleared on close and after retention; consents are append-only records |
| Secrets | `.env` git-ignored; `.env.example` contains only development placeholders |

## Personal data & legal context (Egypt)
Health information is sensitive personal data under Egypt's Personal Data Protection Law
No. 151/2020 and its executive regulations. This repository is an **academic build using synthetic
data only** (`@example.test` accounts, fictional names). Before processing real patient data the
deployment must be reviewed by qualified legal/compliance professionals (lawful basis, licensing,
cross-border transfer, retention, DPO, breach notification). Encryption or GDPR-style practices alone
do not make the platform compliant.

## Known limitations
- Email delivery requires SMTP configuration (default mailer `log`). SMS/WhatsApp not implemented.
- Real-time push requires a broadcaster (Reverb) — not enabled by default; clients poll.
- Staff invitations require the invitee to already have an account.
- No 2FA; no automated suspicious-login detection (admin alert type exists for future use).
- Urgent consultation (spec 002) routes every severity, including critical, to live volunteer
  doctors and does not redirect to an emergency number; response times are not guaranteed (live
  counts and real waiting time are shown instead). This operational model must be reviewed with
  qualified medical/legal advisers before production.
- Backups, HTTPS termination and secure cookies (`SESSION_SECURE_COOKIE=true`) are deployment
  responsibilities (see `docs/setup.md`).
