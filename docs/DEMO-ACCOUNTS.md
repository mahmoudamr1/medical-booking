# Demo Accounts (development only)

All accounts below are **synthetic** (`@example.test`, fictional names) and exist only in local /
development environments. They are created by `php artisan demo:seed`, which **refuses to run when
`APP_ENV=production`**; in production the API also rejects any `@example.test` login.

Passwords were generated once and are defined in `backend/config/demo.php` (override any of them with
`DEMO_PASSWORD_<KEY>` in `backend/.env`). E2E tests read the same values from `frontend/tests/e2e/accounts.ts`.

App URL: **http://localhost:3000** · Login page: http://localhost:3000/auth/login · API: http://localhost:8000/api/v1

## The seven role accounts

| # | Role | Email | Password | Dashboard | Roles / permissions | Status & data |
|---|---|---|---|---|---|---|
| 1 | Admin | `admin@example.test` | `Demo-GGH0Z6zRKs!` | http://localhost:3000/dashboard/admin | role `admin` → admin.access, users.manage, doctors.verify, specialties.manage, clinics.manage, appointments.oversee, reviews.moderate, urgent.oversee, audit.view, settings.manage, reports.view | Active. Sees platform stats, 2 pending verifications, 1 open review report, 1 flagged urgent request, audit log |
| 2 | Patient / customer | `patient@example.test` | `Demo-AxXlsaoJM4!` | http://localhost:3000/dashboard/patient | role `patient` → appointments.book, appointments.view-own, reviews.create, urgent.request | Active. 7 appointments: upcoming (confirmed), pending confirmation, 2 completed (one reviewable), cancelled, no-show, rejected. No open urgent request (free to create one) |
| 3 | Verified doctor | `dr.karim@example.test` | `Demo-PUoLRPjAHp!` | http://localhost:3000/dashboard/doctor | roles `doctor` + `patient` → doctor.profile.manage, doctor.schedule.manage, doctor.appointments.manage, doctor.verification.submit, volunteer.participate | Approved cardiologist at Al Shifa (Nasr City branch), instant booking, Sat–Thu 10:00–15:00 (break 12:30–13:00) + online 19:00–22:00, completed visits with reviews, upcoming appointments |
| 4 | Volunteer doctor | `dr.volunteer@example.test` | `Demo-hlUMkMhiOf!` | http://localhost:3000/dashboard/doctor/urgent | roles `doctor` + `patient` | Approved general practitioner, **opted in** to the volunteer program (Cairo-wide, online + in-person, max 2 concurrent), live availability window of 12 h from the last `demo:seed`; completed urgent consultation in history |
| 5 | Pending / unverified doctor | `dr.pending@example.test` | `Demo-7ANWis8nIA!` | http://localhost:3000/dashboard/doctor/verification | roles `doctor` + `patient` | Verification status **pending**, license document uploaded; not visible in public search; cannot receive urgent requests |
| 6 | Clinic owner | `clinic.owner@example.test` | `Demo-hYkWzO43sg!` | http://localhost:3000/dashboard/clinic | role `patient` + clinic role **owner** of *Al Shifa Medical Center* → all clinic permissions (organization, branches, staff, doctors, appointments view/book/manage, schedules, reports) | 2 branches (Nasr City, Heliopolis) with opening hours, 2 affiliated doctors, 1 receptionist, clinic appointments incl. reception bookings |
| 7 | Receptionist / clinic staff | `reception@example.test` | `Demo-Ws6Yu7zXIW!` | http://localhost:3000/dashboard/clinic | role `patient` + clinic role **receptionist** at Al Shifa → appointments view/book/manage, schedules view | Can book on behalf of patients, confirm/cancel/complete; cannot manage staff, branches or reports; no access to other clinics |

## Supporting accounts (shared password `Demo-RiHnPunOQz!`)

| Email | Purpose |
|---|---|
| `patient2@example.test` | Second patient: completed visits (one review hidden by moderation), urgent request history (completed, unmatched, flagged) |
| `dr.omar@example.test` | Pediatrics, **manual confirmation** (pending requests), personal practice in Maadi |
| `dr.salma@example.test` | Dermatology at Al Shifa – Heliopolis |
| `dr.nour@example.test`, `dr.hany@example.test` | Doctors at Nile Clinic (Dokki) / personal practice |
| `dr.youssef@example.test` | Orthopedics, Alexandria |
| `dr.mona@example.test` | GP and volunteer (Nasr City, "tonight" window) |
| `dr.pending2@example.test` | Second pending verification application (urology) |
| `clinic2.owner@example.test` | Owner of *Nile Clinic* — used to demonstrate tenant isolation |

## Test data available

| Area | Data |
|---|---|
| Directory | 14 specialties, 27 Egyptian governorates with cities/areas, **120 approved doctors** (8 per specialty + core accounts), 2 pending |
| Organizations | **20** (8 hospitals, medical centers and clinics, `type` filter: `GET /clinics?type=hospital`) with **47 branches across 23 governorates**, generated logos and opening hours |
| Images | Generated SVG avatars for every doctor and SVG logos for every clinic (`App\Services\Demo\DemoImageGenerator`); licensed stock photos for page design in `frontend/public/images` (see its CREDITS.md) |
| Showcase | `doctor.01…112@example.test` doctors and `patient.01…60@example.test` patients (password `Demo-RiHnPunOQz!`); ~800 appointments (incl. ~170 upcoming confirmed bookings) and ~500 Arabic/English reviews |
| Scheduling | Every doctor: clinic hours Sat–Thu with a break + online evenings → real bookable slots for the next 30 days |
| Appointments | 14 demo appointments (`MB-DEMO0001` … `MB-DEMO0014`) covering confirmed, pending_confirmation, completed, cancelled_by_patient, cancelled_by_doctor, rejected, expired, no_show; 2 booked by reception |
| Reviews | 3 reviews (2 published, 1 hidden after a report); ratings recomputed |
| Urgent | 2 volunteers with live windows; 3 closed requests for patient2 (completed / unmatched / flagged) |
| Verification | 2 pending applications with a synthetic license PDF each |

## Generate / update the demo accounts
```bash
source scripts/env.sh            # portable toolchain (Windows) – see docs/setup.md
cd backend
php artisan demo:seed            # create or update everything; safe to run repeatedly (no duplicates)
```
`demo:seed` re-applies configured passwords, re-activates suspended demo users, resets the volunteer
availability windows, and prints the account table. Existing demo appointments/reviews are kept.

## Reset the local demo environment
```bash
cd backend
php artisan demo:seed --fresh    # DROPS all tables, migrates, seeds roles + geography + specialties + demo data
```
Use this after tests or manual experiments changed demo state (e.g. the pending doctor was approved).
Dates of demo appointments are relative to the moment you run it.

## Notes
- `php artisan db:seed` also runs the demo seeder outside production.
- Never copy these passwords into a production environment; production deploys must not run `demo:seed`.
