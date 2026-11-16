# Implementation Plan — Medical Booking Platform

Source of requirements: `claude/plan.md` (SRS). Spec-Kit artifacts: `specs/001-medical-booking-platform/`
(spec, plan, research, data model, API contract, tasks). Constitution: `.specify/memory/constitution.md`.

---

## 1. Current repository assessment (audit 2026-11-16)

### Repository state
- No usable git history (`.git` was an empty directory). Re-initialized; baseline commit `3e8ce96`
  on `main`; further work is left uncommitted (no branches or commits unless requested).
- Single Next.js app at the repository root. No backend application. No tests. No CI.
- `node_modules` not installed. No `.env.example`.
- Tooling on the dev machine: Node 24, Python 3.12. **Missing**: PHP, Composer, PostgreSQL, Redis,
  Docker → resolved with a portable, project-local toolchain (`scripts/setup-toolchain.sh`).

### Frontend stack (kept)
| Item | Version / detail |
|---|---|
| Next.js | 16.0.10, App Router, `src/app` |
| React | 19.2.1 |
| TypeScript | 5, `strict: true`, alias `@/* → src/*` |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`) + legacy `tailwind.config.js` tokens (brand `#5B64F2`, shadcn-style HSL vars) |
| UI | Radix (avatar, dialog, dropdown, select, separator, tabs), CVA, `tailwind-merge`, shadcn-style `components/ui/{button,card,input,dialog,avatar}` |
| Data | TanStack Query 5 (provider configured), `react-hot-toast` |
| Dates | `date-fns` 4, `react-day-picker` 9 |
| Icons | `lucide-react` (only icon system) |
| Unused / to remove | `pocketbase`, `node-fetch`, `framer-motion` (verify usage) |

Layout: `<html lang="ar" dir="rtl">` hard-coded; Arabic-only strings inline in every page; no i18n.

### Existing pages (27) — `src/app`
Public: `/`, `/search`, `/specialties`, `/doctor/[id]`, `/about`, `/support`;
Auth: `/auth/login`, `/auth/register`, `/doctor/register`;
Dashboards: `/dashboard/patient`, `/dashboard/doctor` (+ `schedule`, `pricing`, `vacation`,
`patients`), `/dashboard/admin` (+ `doctors`, `appointments`, `specialties`, `locations`).
Components: `layout/{Header,Footer,MainLayout}`, `calendar/{AvailabilityCalendar,SlotButton}`,
`ui/*`, `ui/contact-methods`.

### Existing "backend" (to be replaced)
- 20 Next.js API route handlers under `src/app/api/**` backed by `src/lib/database.ts`, an
  **in-memory `LocalDatabase` class** seeded with hard-coded users (data lost on restart).
- Passwords stored and compared **in plaintext**; "token" is `token_<id>_<timestamp>`, never
  verified; auth state stored in **localStorage**; roles are a single `role` string.
- Double-booking "prevention" is an in-memory array filter (race-prone, wrong overlap logic).
- `src/lib/pocketbase.ts`, `src/lib/auth.ts`, `pb_migrations/` and docker-compose reference a
  PocketBase server that the API routes don't actually use.
- `FINAL_STATUS.md` claims "no mocks / real database" — inaccurate.
- README publishes demo credentials including a personal-looking email.

### Compatibility issues found
- `Dockerfile` uses Node 18 (Next 16 requires ≥ 20.9) and `output: standalone` isn't configured.
- `tailwind.config.js` is a v3-style config; Tailwind 4 only reads it via `@config` (not present),
  so custom tokens (`brand-primary`, `rounded-pill`, `shadow-card`) may be silently missing.
  → Move tokens to `@theme` in `globals.css`.
- `eslint` script has no target directory.

## 2. Existing functionality (what genuinely works today)
- UI pages render with static/mock-backed data; visual design (RTL Arabic, cards, dashboards) is
  reusable.
- Slot-picker UI component (`AvailabilityCalendar`, `SlotButton`).
- Nothing persists across restarts; no real authentication or authorization.

## 3. Missing functionality (vs SRS)
Everything backend-side: real persistence, auth (Sanctum), RBAC, doctor verification + documents,
clinics/branches/staff/affiliations & tenant isolation, services with durations/prices,
scheduling engine (breaks, exceptions, buffer, lead time, horizon), DB-level double-booking
protection, appointment state machine + history, cancellation/rescheduling policies, urgent
assistance & volunteer matching, reviews & moderation, notifications (DB/email/real-time),
queues/scheduler, admin statistics/settings/audit logs, rate limiting, i18n (English/LTR),
clinic directory & clinic dashboard, urgent assistance UI, automated tests of any kind,
documentation set, `.env.example`, working Docker setup.

## 4. Target architecture

```
Browser ──► Next.js 16 (frontend/, :3000) ──rewrites /api, /sanctum──► Laravel 13 (backend/, :8000)
                                                                          │
                                         PostgreSQL 18 ◄──────────────────┤ Eloquent, transactions,
                                         Redis 8 ◄────────────────────────┘ cache, queues
                                         queue:work / schedule:work processes; Reverb optional
```

- **Backend modules** (namespaces inside one app): Auth & Identity, Directory (specialties,
  geography, doctors, clinics, search), Scheduling & Booking, Clinics (tenant), Urgent Assistance,
  Reviews, Notifications, Admin & Audit, Settings.
- **Layers**: thin Controllers → Form Requests (validation) → Actions (one business workflow each,
  transactional) → Models/Scopes; Policies for authorization; API Resources for output;
  Events + queued Listeners/Notifications dispatched after commit; pure domain services for
  calculation (`AvailabilityCalculator`, `ArabicNormalizer`, `AppointmentStatus` transitions).
- **Errors**: one exception renderer producing the envelope; domain exceptions carry HTTP code and
  machine `code`.
- **Frontend**: existing routes kept; `src/lib/api` client (credentials + XSRF + envelope parsing),
  `src/features/*` domain hooks with TanStack Query, `src/i18n` (ar default, en), shared state
  components (Loading/Empty/Error/StatusBadge/Pagination/ConfirmDialog), RHF + Zod forms.
- Details and decisions: `specs/001-medical-booking-platform/research.md`.

## 5. Database design plan
Full table-by-table design: `specs/001-medical-booking-platform/data-model.md` (to be mirrored into
`docs/database-schema.md` with an ERD).

Highlights:
- ULID primary keys for domain entities; bigint identity for append-only logs.
- RBAC: `roles`, `permissions`, `role_permissions`, `user_roles`; clinic roles on
  `clinic_memberships.role`.
- `appointments` exclusion constraint:
  `EXCLUDE USING gist (doctor_profile_id WITH =, tstzrange(starts_at, blocked_until,'[)') WITH &&)
  WHERE (status IN ('pending_confirmation','confirmed'))`.
- `urgent_request_dispatches` partial unique index: one `accepted` per request.
- CHECK constraints for prices ≥ 0, periods, ratings 1–5, enum columns; UNIQUE review per
  appointment.
- Indexes per query pattern: `(doctor_profile_id, starts_at)`, `(patient_profile_id, starts_at)`,
  `(clinic_id, starts_at)`, `(status, hold_expires_at)`, GIN trigram on normalized doctor search
  text, `(verification_status, is_active)`, etc.
- Geography tables (governorates → cities → areas) for Egypt, seeded.

## 6. Implementation phases

| # | Phase | Main deliverables | Acceptance |
|---|---|---|---|
| 0 | Repository audit | This document; spec-kit spec/plan/tasks; git baseline | Plan reviewed |
| 1 | Backend foundation | Toolchain scripts; monorepo move (`frontend/`); Laravel 13 in `backend/`; Postgres + Redis config; Sanctum SPA auth (register/login/logout/me/reset/verify); `/api/v1` routing; envelope + exception rendering; rate limiting; health check; CORS; test DB; docker-compose; `.env.example` | `GET /api/v1/health` ok; auth feature tests pass; migrations run clean |
| 2 | Core domain | Migrations/models/factories for identity, RBAC, profiles, geography, specialties, clinics, branches, memberships, affiliations, services; policies + tenant middleware; seeders (idempotent, synthetic) | Relationship + constraint tests; cross-tenant isolation tests pass |
| 3 | Verification & directory | Doctor onboarding & documents (private), verification submit/approve/reject/suspend (audited), public doctor/clinic/specialty APIs, search filters, pagination, trigram search, indexes | Only verified active doctors public (tests); search filter tests |
| 4 | Scheduling engine | Schedules, breaks, exceptions, preferences, availability calculator, booking action with lock + exclusion constraint, state machine, history, cancel, reschedule, hold expiry job | Unit tests for calculator/transitions; feature tests; **concurrency test 1 success / N-1 409** |
| 5 | Patient & doctor apps | Frontend move to real API: auth (cookie), i18n ar/en, home, search, profile, booking flow, patient dashboard, doctor dashboard/calendar/schedule/services/preferences/documents, notifications (DB + mail + bell) | Patient books & doctor manages real appointments end-to-end (Playwright) |
| 6 | Clinic management | Clinic APIs + dashboard: org, branches/hours, staff invitations/roles, affiliations, clinic appointments & booking on behalf, reports | Isolation tests (403/404, no leakage) |
| 7 | Urgent assistance | Volunteer opt-in/profile/availability windows (auto-expire), urgent request w/ emergency gate, consent, tiered dispatch jobs with timeouts, atomic accept, redaction, rate limit, abuse report, broadcasting + polling UI | **Concurrent acceptance test passes**; life-threatening path shows 123 and creates nothing |
| 8 | Reviews & admin | Reviews (eligibility, one per appt), rating aggregation, reports/moderation; admin stats, users, verification, specialties, clinics, appointments, urgent oversight, audit logs, settings, reports | Admin endpoints permission-tested; stats from real aggregates |
| 9 | Security & QA | Authorization & tenant audit, upload audit, validation review, Vitest + Playwright critical flows, EXPLAIN ANALYZE on search/availability | All critical tests pass |
| 10 | Delivery | Clean-DB migrate+seed, full test run, frontend build, docs set, README, final report | Definition-of-Done checklist (SRS §25) verified |

Each phase ends with: run tests → fix → verify existing features → update docs → update checklist
below.

### Phase status (spec-kit reconciliation, 2026-11-17)

Source of truth for task state: `specs/001-medical-booking-platform/tasks.md` (every ticked task
carries its evidence). "Implemented" means the code exists and was inspected; it does not by itself
mean a full test run was done in this pass — see §7 for what was actually run.

| # | Phase | Status | Evidence / open items |
|---|---|---|---|
| 0 | Repository audit | Done | This document, spec-kit artifacts, baseline commit `3e8ce96` |
| 1 | Backend foundation | Done | T001–T019 |
| 2 | Core domain | Done | T020–T027 |
| 3 | Verification & directory | Done | T030–T038 |
| 4 | Scheduling engine | Done | T040–T051 |
| 5 | Patient & doctor apps | Implemented | T060–T069 ticked with file evidence; the phase's Playwright acceptance is **not yet verified** (T101 open) |
| 6 | Clinic management | Implemented | T070–T074 |
| 7 | Urgent assistance | Implemented, redefined | T080–T086. The emergency gate / "123" path in the row above was **removed** by `specs/002-urgent-live-consultation` (constitution v2.0.0, Principle VII): every severity is routed to live doctors. Spec 002's own task list (T201–T218) is still unticked although its code and tests exist (`tests/Feature/Urgent/{LiveConsultationTest,UrgentMessagingTest}.php`, `frontend/src/features/urgent/`) — to be reconciled by that spec's owner |
| 8 | Reviews & admin | Implemented | T090–T094 |
| 9 | Security & QA | In progress | T102 done; T100 (authorization/tenant/upload audit) and T101 (Playwright E2E) open |
| 10 | Delivery | Open | T103 docs done; T104 (clean-environment verification) and T105 (final report) open |
| 11 | Code quality (tasks.md Phase 11) | Done | T110–T120 |
| 12 | Project structure (Phase 12/12b) | Done | T121–T127, T144–T149; layout in `docs/architecture.md` |
| 13 | UI consistency (Phase 13) | Open | T140–T143 |
| 14 | Convergence (Phase 14) | Open | T150–T159: gaps found by `/speckit-converge` on 2026-11-17 |

## 7. Acceptance criteria (tracked)

Ticks below are only for criteria with evidence. Runs performed in the 2026-11-17 reconciliation
pass (other agents were editing the tree at the same time, so re-run before delivery):

| Gate | Command | Result |
|---|---|---|
| PHP style | `vendor/bin/pint --test` | passed |
| PHP static analysis | `vendor/bin/phpstan analyse` | passed, 0 errors |
| TypeScript | `npm run typecheck` | passed (exit 0) |
| ESLint (incl. dependency direction) | `npm run lint` | passed (exit 0) |
| Frontend unit tests | `npx vitest run` | 5 files, 47 tests passed |
| Prettier | `npm run format:check` | **failed** on `frontend/tsconfig.json` (rewritten by `next build`) → T150 |
| Backend test suite | `php artisan test` | not run in this pass (needs the test database; T104) — not yet verified |
| Production build | `NEXT_DIST_DIR=.next-build npm run build` | not run in this pass (T104) — not yet verified |
| E2E | `npx playwright test` | not run in this pass (T101) — not yet verified |

### Backend
Ticked in earlier phases against the backend suite; the suite was not re-run in this pass.
- [x] Laravel application runs
- [x] PostgreSQL connection works
- [x] Migrations execute from a clean database
- [x] Authentication works
- [x] Roles and permissions work
- [x] Doctor verification works
- [x] Doctor search works
- [x] Clinic isolation works
- [x] Scheduling works
- [x] Appointment booking works
- [x] Concurrent booking is protected
- [x] Cancellation works
- [x] Rescheduling works
- [x] Volunteer registration works
- [x] Volunteer matching works
- [x] Concurrent acceptance is protected
- [x] Notifications are persisted and delivered through configured channels
- [x] Admin operations work
- [x] Audit logging works

### Frontend
All items below are **implemented** (paths relative to `frontend/src`; typecheck, lint and unit tests
pass). They stay unticked until a browser run confirms them: the Playwright suite
(`frontend/tests/e2e/*.spec.ts`) was not run in this pass — **not yet verified** (T101), and
T105 ticks them after the T104 clean-environment run.
- [ ] Existing frontend is preserved appropriately — stack kept (Next.js 16, React 19, Tailwind 4, Radix, TanStack Query, lucide); pages rewired to the API and reorganized into `features/<domain>/` (T121). Two baseline pages were dropped without a recorded reason → §8, T159
- [ ] Public pages work — `app/{page,search,specialties,doctor/[id],clinics,clinics/[slug],about,support,privacy,terms}` → `features/directory`, `features/clinic` (T064, T065, T074)
- [ ] Authentication pages work — `app/auth/{login,register,forgot-password,reset-password}`, `app/doctor/register` → `features/auth`; session via `lib/auth/AuthProvider.tsx` (T062). Email-verification UX is partial → T157
- [ ] Patient dashboard works — `features/patient` (grouped appointments, details, cancel, reschedule, profile, consents), `app/notifications` (T066)
- [ ] Doctor dashboard works — `features/doctor` (overview, schedule, exceptions, services, preferences, profile, verification) (T067)
- [ ] Clinic dashboard works — `features/clinic` (overview + reports, branches, staff, doctors, appointments, schedules, settings) (T074)
- [ ] Admin dashboard works — `features/admin` (overview, users, doctors/verification, specialties, clinics, appointments, reviews, urgent, audit, settings) (T093)
- [ ] Search and filters work — `features/directory/components/search/*`, filters kept in the URL (T064). The API's `clinic` filter has no UI control → T156
- [ ] Booking flow works — `features/booking/components/BookingPanel.tsx` incl. 409 handling; unit test `tests/unit/BookingPanel.test.tsx` passes (T065)
- [ ] Calendar works — `features/doctor/components/calendar/{TimeGrid,WeekAgenda,MonthGrid}.tsx` (T067)
- [ ] Urgent assistance works — `features/urgent` (live available doctors, request form, status polling, messages, volunteer settings, doctor inbox), per spec 002 (T086)
- [ ] Arabic RTL works — `i18n/*`, `<html lang dir>` from the locale cookie in `app/layout.tsx`; unit test `tests/unit/i18n.test.tsx` passes (T060)
- [ ] English LTR works — same mechanism; every feature ships `i18n/{ar,en}.ts`
- [ ] Responsive layouts work — specs exist (`tests/e2e/{responsive,i18n-mobile}.spec.ts`); not yet verified. Container/dropdown consistency work is open (T140–T143)
- [ ] Loading, empty, and error states work — `components/shared/{states,EmptyState}.tsx` used across features (T063)

### Quality
- [ ] Backend automated tests pass — not yet verified in this pass (T104); Pint and PHPStan pass
- [ ] Frontend automated tests pass — Vitest: 47/47 passed (2026-11-17); Playwright: not yet verified (T101)
- [ ] Production frontend build succeeds — not yet verified in this pass (T104)
- [ ] No critical authorization vulnerabilities remain — audit in progress (T100); not yet verified
- [x] No duplicate active doctor appointments can be created
- [x] No duplicate urgent request acceptance can occur
- [x] No real personal data is embedded in demo fixtures
- [x] No production secrets are committed
- [ ] Documentation is complete — structure docs, README and CONTRIBUTING updated (T127); operations/deployment/user-guide docs and the final report (T105) are in progress
- [ ] Local setup has been verified from a clean environment — not yet verified (T104)
- [ ] All quality gates green — Prettier gate currently fails on `frontend/tsconfig.json` (T150)

## 8. Removed / replaced existing functionality (documented per constitution VI)
| Item | Reason |
|---|---|
| `src/app/api/**` Next route handlers | Business logic must live in Laravel; they used an in-memory store with plaintext passwords |
| `src/lib/database.ts` (LocalDatabase) | Mock persistence; replaced by PostgreSQL via API |
| `src/lib/pocketbase.ts`, `src/lib/auth.ts`, `pb_migrations/`, `pocketbase` dep | Backend replaced by Laravel per SRS |
| localStorage auth in `auth-context.tsx` | SRS forbids tokens/credentials in localStorage; replaced by Sanctum cookie session + `/auth/me` |
| `RUN.bat`/`stop.bat` (PocketBase) | Replaced by `scripts/dev-services.sh` + documented commands |
| `FINAL_STATUS.md` | Inaccurate claims; superseded by final implementation report |
| Demo credentials with personal-looking email in README | Replaced by synthetic `@example.test` accounts |
| Urgent "life-threatening" gate and emergency number (123) in UI, notifications and public payloads | Product decision 2026-11-16 (constitution v2.0.0 Principle VII, `specs/002-urgent-live-consultation` FR-204): urgent requests of every severity are connected to live doctors instead of being redirected. The unused `emergency_number` setting still exists in the backend → T151 |
| Stock photos on home/about/auth pages | Deleted by user decision (T118); avatars are generated faceless SVGs (T117) |
| `/dashboard/doctor/pricing`, `/dashboard/doctor/vacation` | Replaced, not removed: `/dashboard/doctor/services` (durations + prices per branch) and `/dashboard/doctor/exceptions` (closed days / custom hours) |
| `/dashboard/doctor/patients`, `/dashboard/admin/locations` (baseline pages) | No longer present and no equivalent API exists (geography is seeded by `GeographySeeder`; spec 001 defines neither a doctor patient list nor location administration). **Reason not recorded** — to be confirmed or restored by the maintainer (T159) |
| `src/components/{calendar,doctors,appointments}`, `src/lib/api/<domain>.ts`, `src/types/<domain>.ts` | Moved, no behaviour change: feature-based layout `src/features/<domain>/` (T121, constitution v2.1.0) |
| `routes/api.php` single file, inline `$request->validate()` | Split into `routes/api/v1/<area>.php` (T126) and Form Requests under `app/Http/Requests/<Area>` (T125) |

## 9. Known external blockers (isolated)
- Production legal/compliance review under Egypt PDPL 151/2020 + executive regulations — required
  before processing real patient data; out of scope for the academic build.
- SMTP credentials — email works with `log` mailer locally; real delivery needs configuration.
- SMS/WhatsApp — not implemented (paid providers); documented as optional integration.

(The earlier blocker "emergency number 123 must be operationally verified" no longer applies: the
emergency-number redirect was removed by spec 002.)
