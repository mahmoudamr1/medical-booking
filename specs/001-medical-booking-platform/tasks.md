# Tasks: Medical Booking Platform

**Input**: `specs/001-medical-booking-platform/` (plan, spec, research, data-model, contracts)
**Tests**: REQUIRED (constitution III + SRS §21). Paths: `backend/…`, `frontend/…`.
Story map: US1 search+book, US2 manage appointments, US3 doctor practice, US4 admin/verification,
US5 clinics, US6 urgent, US7 reviews, US8 bilingual UX.

## Phase 1: Setup (SRS Phase 1 — Backend foundation)

- [x] T001 Write portable toolchain bootstrap in scripts/setup-toolchain.sh
- [x] T002 Write Postgres/Redis lifecycle script in scripts/dev-services.sh and PATH helper scripts/env.sh
- [x] T003 Move Next.js app into frontend/ with git mv (src, configs, package*.json) and fix root files
- [x] T004 Create Laravel 13 project in backend/ (composer create-project) and install Sanctum (php artisan install:api)
- [x] T005 Configure backend/.env.example for pgsql, redis, Africa/Cairo, ar locale, sanctum stateful domains, CORS
- [x] T006 [P] Add infrastructure/docker-compose.yml (postgres:18, redis:8, backend php-fpm/artisan serve, frontend node 24) and fix frontend/Dockerfile
- [x] T007 Configure Next.js rewrites for /api and /sanctum in frontend/next.config.ts
- [x] T008 Remove PocketBase artifacts (pb_migrations/, RUN.bat, stop.bat, FINAL_STATUS.md) per docs/implementation-plan.md §8

## Phase 2: Foundational (blocking)

- [x] T010 ApiResponse helper + exception rendering envelope (401/403/404/409/422/429/500) in backend/app/Support/ApiResponse.php and backend/bootstrap/app.php
- [x] T011 DomainException base with code/status in backend/app/Exceptions/DomainException.php
- [x] T012 /api/v1 route group, rate limiters (login, urgent, api) in backend/routes/api.php and backend/app/Providers/AppServiceProvider.php
- [x] T013 Health endpoint (db + redis) in backend/app/Http/Controllers/Api/V1/HealthController.php
- [x] T014 Migrations: extensions btree_gist + pg_trgm; users (ulid, locale, status, phone); roles/permissions/pivots  (also geography, profiles, clinics — see T020/T021) in backend/database/migrations/
- [x] T015 Auth actions + controllers: register, login (throttled), logout, me, update profile/password, forgot/reset password, email verification in backend/app/Http/Controllers/Api/V1/Auth/
- [x] T016 RBAC: Role/Permission models, User::hasRole/hasPermission, Gate::before for admin, permission seeder in backend/app/Models and backend/database/seeders/RolePermissionSeeder.php
- [x] T017 AuditLogger service + audit_logs migration in backend/app/Services/Audit/AuditLogger.php
- [x] T018 Test DB config (phpunit.xml pgsql medical_booking_test) + Feature tests: HealthTest, AuthTest (register/login/logout/me/throttle/reset) in backend/tests/Feature/
- [x] T019 Platform settings table + Settings service with defaults in backend/app/Services/Settings.php

**Checkpoint**: API runs, DB connects, auth tests green.

## Phase 3: Core domain (SRS Phase 2)

- [x] T020 Migrations/models: geography (governorates, cities, areas), specialties, patient_profiles, doctor_profiles, doctor_specialties, doctor_documents
- [x] T021 Migrations/models: clinics, clinic_memberships, clinic_branches, branch_hours, doctor_branch_affiliations, medical_services
- [x] T022 Enums: VerificationStatus, ClinicRole (with permission map), ConsultationType, MembershipStatus in backend/app/Enums/
- [x] T023 Factories for all models in backend/database/factories/
- [x] T024 Idempotent seeders: geography (Egypt), specialties (14), demo users/doctors/clinics (synthetic) in backend/database/seeders/
- [x] T025 ClinicContext middleware (active membership required, 404 otherwise) + ClinicPolicy in backend/app/Http/Middleware/ResolveClinic.php
- [x] T026 [P] Database tests: FK, unique, check constraints in backend/tests/Database/CoreConstraintsTest.php
- [x] T027 [P] Tenant isolation tests in backend/tests/Feature/Clinic/TenantIsolationTest.php

## Phase 4: US4 + US1 directory — Verification & directory (SRS Phase 3)

- [x] T030 [US4] Doctor onboarding: register as doctor creates doctor profile draft; profile update; specialties sync in backend/app/Http/Controllers/Api/V1/Doctor/ProfileController.php
- [x] T031 [US4] Private document upload/download/delete with MIME checks in backend/app/Http/Controllers/Api/V1/Doctor/DocumentController.php
- [x] T032 [US4] Verification submit + admin approve/reject/suspend/reinstate actions (audited, notified) in backend/app/Actions/Doctors/
- [x] T033 [US1] ArabicNormalizer + search_text maintenance (model observer) in backend/app/Services/Search/
- [x] T034 [US1] DoctorSearch query object with all filters + sorting + pagination in backend/app/Services/Search/DoctorSearch.php
- [x] T035 [US1] Public controllers: specialties, locations, doctors (index/show/services/reviews), clinics, home in backend/app/Http/Controllers/Api/V1/Public/
- [x] T036 [US1] API Resources: DoctorCardResource, DoctorPublicResource (no private fields), ClinicResource, SpecialtyResource
- [x] T037 [US1] Tests: unverified doctor never public; filters; private data absent; document access policy in backend/tests/Feature/Directory/
- [x] T038 [US4] Admin specialty CRUD (cache invalidation) in backend/app/Http/Controllers/Api/V1/Admin/SpecialtyController.php

## Phase 5: US1/US2/US3 — Scheduling engine (SRS Phase 4)

- [x] T040 [US3] Migrations: doctor_schedules, schedule_breaks, schedule_exceptions, appointments (+exclusion constraint), appointment_status_histories
- [x] T041 [US3] AppointmentStatus enum with transition table in backend/app/Enums/AppointmentStatus.php
- [x] T042 [US3] AvailabilityCalculator (pure) in backend/app/Services/Scheduling/AvailabilityCalculator.php
- [x] T043 [US3] AvailabilityService (loads data, caches nothing private) + availability endpoint
- [x] T044 [US1] BookAppointment action (lock doctor row, expire holds, revalidate, insert, history, afterCommit events; 23P01→409)
- [x] T045 [US2] TransitionAppointment action (actor rules) + CancelAppointment (policy notice) + RescheduleAppointment (atomic)
- [x] T046 [US3] Doctor schedule/exception/preferences/services controllers + Form Requests
- [x] T047 [US3] ExpirePendingHolds job + scheduler registration in backend/routes/console.php
- [x] T048 [US1] Unit tests: calculator (breaks, exceptions, buffer, lead, horizon, durations, past), transitions, cancellation policy in backend/tests/Unit/
- [x] T049 [US1] Feature tests: booking, cancel, reschedule (incl. failure keeps original), doctor actions, authorization in backend/tests/Feature/Booking/
- [x] T050 [US1] DB test: exclusion constraint rejects overlap; allows after cancel in backend/tests/Database/AppointmentOverlapTest.php
- [x] T051 [US1] Concurrency test: N processes book same period → 1 success in backend/tests/Concurrency/BookingConcurrencyTest.php

## Phase 6: US1/US2/US3/US8 — Patient & doctor applications (SRS Phase 5)

> Reconciled 2026-11-17 (T120). Paths in task text are historical; evidence cites the current
> feature-based layout (`frontend/src/features/<domain>/`, see T121).

- [X] T060 [US8] i18n: dictionaries ar/en, locale cookie, html lang/dir in frontend/src/i18n/ and frontend/src/app/layout.tsx; Tailwind 4 @theme tokens — `src/i18n/{config,provider,server,translate,format,ar,en}.ts` (ar default, `locale` cookie; ar/en assemble every `features/*/i18n`), `src/app/layout.tsx` sets `<html lang dir>` from `getServerLocale()`, `@theme inline` tokens in `src/app/globals.css`; `tests/unit/i18n.test.tsx`
- [X] T061 API client with credentials, XSRF, envelope, ApiError in frontend/src/lib/api/client.ts; types in frontend/src/types/api.ts — `src/lib/api/client.ts` (XSRF cookie header, 419 refresh+retry, envelope, `ApiError`), `src/lib/api/errors.ts`; shared entities in `src/types/api.ts`, feature shapes in `features/*/types.ts`; `tests/unit/api-client.test.ts`
- [X] T062 Auth: AuthProvider using /auth/me, login/register/logout/forgot/reset pages, route guards; delete src/app/api and LocalDatabase — `src/lib/auth/AuthProvider.tsx` (`/auth/me`), `features/auth/components/{LoginScreen,RegisterForm,ResetPasswordScreen,RequireAuth}.tsx`, routes `app/auth/{login,register,forgot-password,reset-password}`; `RequireAuth` used by every dashboard layout; `src/app/api/` and `LocalDatabase` no longer exist (grep: 0 matches)
- [X] T063 [P] Shared components: LoadingState, EmptyState, ErrorState (retry), StatusBadge, Pagination, ConfirmDialog, DoctorCard, SpecialtyCard, AppointmentCard, LanguageSwitcher — `components/shared/{states (LoadingState, ErrorState+retry),EmptyState,StatusBadge,Pagination,ConfirmDialog,DoctorCard}.tsx`, `features/directory/components/SpecialtyCard.tsx`, `features/appointments/components/AppointmentCard.tsx`, `components/layout/LanguageSwitcher.tsx`; `tests/unit/StatusBadge.test.tsx`
- [X] T064 [US1] Home page wired to /home; specialties page; search page with server-side filters + URL state — `features/directory/api.ts` (`/home`, `/specialties`, `/doctors`), `components/home/HomeScreen.tsx`, `app/specialties/page.tsx`, `components/search/{SearchScreen,SearchFilters,searchParams}.ts(x)` (all filters in the URL). The API's `clinic` filter is not exposed in the UI → T156
- [X] T065 [US1] Doctor profile page + booking flow (branch/service → date → slots → confirm → success; 409 handling) — `features/directory/components/profile/DoctorProfileScreen.tsx` + `features/booking/components/{BookingPanel,ServiceOption,AvailabilityCalendar,SlotButton,BookingSuccess}.tsx`; 409 branch in `BookingPanel.tsx`; `tests/unit/BookingPanel.test.tsx`
- [X] T066 [US2] Patient dashboard: grouped appointments, details, cancel, reschedule, profile, notifications — `features/patient/components/PatientHomeScreen.tsx` (upcoming/pending/completed/cancelled), `app/dashboard/patient/appointments/[id]` + `features/appointments/components/AppointmentDetails.tsx`, `PatientDialogs.tsx` (cancel, reschedule), `profile/PatientProfileScreen.tsx`, `app/notifications/page.tsx`
- [X] T067 [US3] Doctor dashboard: overview, calendar (day/week/month), schedule editor (hours/breaks), exceptions, services & prices, preferences, documents/verification, appointment actions — `features/doctor/components/{overview/*,calendar/{TimeGrid,WeekAgenda,MonthGrid},ScheduleEditor,exceptions/*,services/*,preferences/*,verification/*,DoctorAppointmentActions}`; routes `app/dashboard/doctor/*`
- [X] T068 Notifications: database + mail notifications for booking events; bell dropdown with polling — `backend/app/Notifications/BaseNotification.php` (database + mail when configured), `AppointmentNotification.php`, `Listeners/SendAppointmentNotifications.php`; `features/notifications/components/NotificationBell.tsx` (`refetchInterval` polling) + `app/notifications/page.tsx`
- [X] T069 [P] Vitest setup + unit tests for api client, i18n, booking components in frontend/tests/unit/ — `vitest.config.mts`, `tests/setup.ts`, `tests/unit/{api-client,i18n,BookingPanel,StatusBadge,landing-validation}`; `npx vitest run` on 2026-11-17: 5 files, 47 tests passed

## Phase 7: US5 — Clinic management (SRS Phase 6)

- [x] T070 [US5] Clinic APIs: create org, details, branches + hours, staff invitations/roles, affiliations, services, schedules (read)
- [x] T071 [US5] Clinic appointments: list/show/book-on-behalf/confirm/cancel/complete with ClinicRole permissions
- [x] T072 [US5] Clinic reports endpoint (aggregates)
- [x] T073 [US5] Feature tests: role permissions + cross-tenant 404 for every clinic endpoint
- [X] T074 [US5] Frontend: clinic directory pages (/clinics, /clinics/[slug]) and dashboard/clinic (overview, branches, staff, doctors, appointments, reports, settings) — `app/clinics/{page,[slug]/page}.tsx` → `features/clinic/components/directory/{ClinicDirectoryScreen,ClinicProfileScreen}`; `app/dashboard/clinic/[clinicId]/{page,branches,staff,doctors,appointments,schedules,settings}` → feature Screens; reports in `overview/ClinicReports.tsx` (gated by `viewReports`)

## Phase 8: US6 — Urgent assistance (SRS Phase 7)

- [x] T080 [US6] Migrations/models: volunteer_profiles, volunteer_specialties, volunteer_locations, volunteer_availabilities, urgent_requests, urgent_request_dispatches, consents
- [x] T081 [US6] Volunteer opt-in/profile/availability endpoints + ExpireVolunteerAvailability job — note: no separate job exists; windows lapse by query (`starts_at <= now < ends_at` in `Services/Urgent/VolunteerMatcher.php`)
- [x] T082 [US6] CreateUrgentRequest action (emergency gate, consent, disclaimer, rate limit) + VolunteerMatcher (tiers) + DispatchUrgentRequestJob (timeouts, idempotent) — note: emergency gate later removed by spec 002 (constitution v2.0.0, Principle VII)
- [x] T083 [US6] AcceptUrgentRequest (conditional update, 409), decline, start, complete, cancel; redacted resource until accepted; access logging
- [x] T084 [US6] Broadcast events + channels authorization; notifications to doctors/patient
- [x] T085 [US6] Tests: matcher eligibility unit tests, flow feature tests, unmatched path, redaction, concurrency accept test
- [X] T086 [US6] Frontend: urgent assistance page (disclaimer, red-flag emergency gate, form, live status polling), doctor volunteer settings + incoming requests — SUPERSEDED in part: the disclaimer/red-flag emergency gate was intentionally removed by `specs/002-urgent-live-consultation` (FR-204; constitution v2.0.0 Principle VII). Built: `app/urgent/{page,[id],history}` → `features/urgent/components/{UrgentScreen,UrgentRequestForm (consent),RequestStatusScreen (5 s polling until terminal),MessageThread}`; doctor `app/dashboard/doctor/{volunteer,urgent}` → `features/urgent/components/{volunteer/*,doctor/DoctorUrgentScreen}`

## Phase 9: US7 + US4 — Reviews & admin (SRS Phase 8)

- [x] T090 [US7] Reviews: create (eligibility), list, report; rating aggregation listener
- [x] T091 [US4] Admin APIs: stats, users, doctors/verification, clinics, appointments, reviews moderation, urgent oversight, audit logs, settings, reports
- [x] T092 [US4] Tests: admin permissions, stats correctness, moderation, audit entries
- [X] T093 [US4] Frontend admin dashboard wired: overview, users, verification (documents viewer), specialties, clinics, appointments, reviews, urgent, audit, settings — `app/dashboard/admin/{page,users,doctors,specialties,clinics,appointments,reviews,urgent,audit,settings}` → `features/admin/components/*/…Screen.tsx`; verification = doctors screen tabs by `verification_status` + `DoctorSheet`/`DoctorDocuments.tsx` (document viewer); urgent live board `UrgentLiveBoard.tsx`
- [X] T094 [US7] Frontend review form after completed appointment + reviews on profile — `features/reviews/components/RateVisitDialog.tsx` used by `features/patient/components/PatientAppointmentActions.tsx`; `DoctorReviews` on `features/directory/components/profile/DoctorProfileScreen.tsx`

## Phase 10: Polish, security & delivery (SRS Phases 9–10)

- [ ] T100 Authorization/tenant/upload/validation audit; fix findings
- [ ] T101 Playwright E2E: register, login, search, book, cancel, doctor schedule, urgent request, admin verification in frontend/tests/e2e/
- [x] T102 EXPLAIN ANALYZE search & availability on 1,000+ doctor seed; tune indexes
- [x] T103 Docs: README, docs/{architecture,database-schema,api-documentation,business-rules,security,setup}.md
- [ ] T104 Clean-environment verification: migrate:fresh --seed, full test suites, npm run build
- [ ] T105 Final implementation report docs/final-report.md + update checklist in docs/implementation-plan.md

## Dependencies

Setup → Foundational → Core domain → Directory → Scheduling → (Patient/Doctor UI, Clinic, Urgent
in sequence; Clinic & Urgent backend may proceed in parallel after Scheduling) → Reviews/Admin →
Polish. MVP = through Phase 6 (US1–US3).

## Parallel opportunities
T006 ∥ T005; T026 ∥ T027; within Phase 6 T063 ∥ T069; backend tests ∥ frontend components of the
same phase once the contract exists.

## Phase 11: Code quality & UI refinement (constitution v1.1.0, Principle VIII)

- [x] T110 Amend constitution to v1.1.0 with Principle VIII (clean, simple, reusable code) and spec-kit analyze/converge loop in .specify/memory/constitution.md
- [x] T111 Add Larastan level 6 gate (backend/phpstan.neon) and fix all errors at the root (typed relations, model @property docs, no inline FQCNs) in backend/app
- [x] T112 Split DemoShowcaseSeeder into single-responsibility helpers; one shared demo helper for users/branches/appointments in backend/database/seeders/Support
- [x] T113 Move business logic out of controllers (schedule validation, patient account creation) into Actions in backend/app/Actions
- [X] T114 Single PageHeader/StatCard/EmptyState in frontend/src/components/shared (re-exported from states.tsx); remove dashboard copies — one definition each in `components/shared/{PageHeader,StatCard,EmptyState}.tsx` (grep: no other `function PageHeader|StatCard|EmptyState`); EmptyState is imported from its own module rather than re-exported via `states.tsx`
- [X] T115 One API module + one types module per feature: move admin api/types to frontend/src/lib/api/admin.ts and frontend/src/types/admin.ts — superseded by T121: admin lives in `features/admin/{api,types}.ts`; `src/lib/api/` holds only `client.ts` + `errors.ts`
- [X] T116 Reusable DoctorCarousel fixing clipped cards and header arrows in frontend/src/components/doctors/ — generalized as `components/shared/Carousel.tsx` (padded track so card borders/shadows are not clipped; prev/next handed to the section header; RTL-aware paging) used for doctor cards in `features/directory/components/home/sections.tsx`; visual check not re-run in this pass
- [x] T117 Replace cartoon demo avatars with professional faceless SVG avatars in backend/app/Services/Demo/DemoImageGenerator.php
- [X] T118 Remove stock-photo usage from home/about/auth pages (photos deleted by user decision) in frontend/src/app — `frontend/public/` is empty; grep for unsplash/pexels/.jpg/.webp/`next/image` in `src` finds only the document-upload `accept` list
- [x] T119 Demo tests must not write to real storage (Storage::fake in backend/tests/Feature/Demo/DemoAccountsTest.php); orphan files cleaned
- [X] T120 Run /speckit-analyze and /speckit-converge after agents finish; append gaps as tasks — run 2026-11-17 for feature 001: analyze report delivered to the coordinator (read-only), converge appended Phase 14 (T150–T159). T100/T101/T140–T143 were still in progress, so rerun both after they land

## Phase 12: Project structure (constitution v2.1.0 — run after Phase 11 agents finish; single writer per tree)

- [X] T121 Frontend: move each domain into src/features/<domain>/{api.ts,types.ts,hooks,components,i18n,index.ts}; keep src/app as thin routes; update imports (no behaviour change) — 11 features (+patient), per-feature query-key sets, i18n assembled from features, lib/api keeps client+errors only, duplicates removed (see docs/architecture.md)
- [X] T122 Frontend: split route files > ~250 lines (search, admin specialties/reviews, clinic staff/doctors, doctor profile) into feature components — every page renders one feature Screen; components split below ~250 lines (data-only types/dictionaries excepted)
- [X] T123 Frontend: enforce dependency direction with ESLint `no-restricted-imports` (no deep feature imports, ui/lib never import features) — eslint.config.mjs; layout gets feature UI via LayoutSlots
- [X] T124 Frontend: single playwright.config.ts with projects; merge helpers.ts + dp-helpers.ts into tests/e2e/fixtures; delete per-agent configs — one config (no projects needed: sessions set locale/viewport), dp-helpers merged into tests/e2e/helpers.ts
- [X] T125 Backend: move all inline $request->validate() (61) into Form Requests under app/Http/Requests/<Area> — 62 calls → 61 new request classes (incl. Shared/{Reason,DateRange}Request and the Doctor/DoctorRequest base) + 3 Concerns traits; appointment/urgent eager-load lists consolidated on the resources; 0 inline validation left
- [X] T126 Backend: split routes/api.php into routes/api/v1/<area>.php files loaded from api.php — auth/public/doctor/patient/urgent/clinic/admin; `route:list --json` identical before/after (138 routes)
- [X] T127 Update docs/architecture.md, README and CLAUDE.md-style contributor notes with the final structure; run /speckit-analyze + /speckit-converge — `docs/architecture.md` "Project structure" checked against the tree (areas, routes, middleware, feature dependency graph), README "Project structure" + "Quality gates" + docs index, new root `CONTRIBUTING.md`, `docs/implementation-plan.md` phase status/checklist; analyze + converge as in T120

## Phase 13: UI consistency (user request — run after Phase 12 frontend restructure; single frontend writer)

- [ ] T140 One page container: `PageContainer` (components/layout) built on the `container-page` utility, same max width + gutters as Header/Footer on EVERY public page; standard vertical rhythm; narrow reading/forms columns constrained INSIDE the container (page edges always align); DashboardShell + TopBar use the same container token instead of inline classes
- [ ] T141 Dropdowns: shadcn `Select` (Radix) replaces NativeSelect for short option lists; searchable `Combobox` (shadcn Command + Popover) for long lists (governorates, cities, areas, specialties, doctors, branches); RTL-correct, keyboard accessible, 44px targets, consistent trigger styling with Input
- [ ] T142 Same pass for related controls: RadioGroup/ToggleGroup for segmented choices, DatePicker (Calendar + Popover) for date inputs, consistent Checkbox/Switch/Tabs styling; remove the replaced primitives
- [ ] T143 Update e2e specs that used `selectOption` on native selects to drive the new components via a shared helper; full suite + responsive screenshots (1440/390, ar/en)

## Phase 12b: API additions requested by the frontend (additive only)

- [X] T144 `GET /doctor/exceptions` accepts optional `from`/`to` (Y-m-d) to list past exceptions; default (today onwards) unchanged — DoctorScheduleManagementTest::test_exceptions_list_defaults_to_upcoming_and_accepts_a_date_window
- [X] T145 `AppointmentResource`: `doctor.avatar_url` and, for the patient viewer only, `review` ({rating, comment} | null), eager-loaded via `AppointmentResource::RELATIONS` — ReviewsAndAdminTest::test_patient_appointment_view_includes_own_review_and_doctor_avatar
- [X] T146 `GET /doctor/profile` (DoctorSelfResource) includes `avatar_url` — DoctorVerificationTest::test_own_profile_includes_avatar_url
- [X] T147 Doctor dashboard `counts.pending` counts only pending requests that have not started (app clock bound in SQL) — DoctorScheduleManagementTest::test_dashboard_pending_counts_only_requests_that_have_not_started
- [X] T148 `POST /urgent-requests` per-IP hourly throttle configurable via `URGENT_IP_RATE_LIMIT` (config `app.urgent_ip_rate_limit`, default 10) — UrgentAssistanceTest::test_urgent_ip_rate_limit_is_configurable
- [X] T149 `GET /doctor/urgent-requests` returns `meta.counts` {open, accepted, closed} for the doctor's inbox (`UrgentRequest::dispatchedTo` scope shared by list and counts) — UrgentAssistanceTest::test_doctor_inbox_carries_counts_for_every_tab

## Phase 14: Convergence

- [ ] T150 CRITICAL: Make the Prettier gate pass durably — `npm run format:check` fails on `frontend/tsconfig.json` because `next build` (incl. `NEXT_DIST_DIR=.next-build`) rewrites its `include` list in Next's own JSON layout; either list `tsconfig.json` in `frontend/.prettierignore` or keep it in a layout both tools agree on, then re-run the gate per Constitution VIII (contradicts)
- [ ] T151 CRITICAL: Remove the dead `emergency_number` platform setting (no consumer since spec 002): `backend/app/Services/Settings.php` DEFINITIONS + config fallback, `backend/config/services.php` `emergency`, `EMERGENCY_NUMBER` in `backend/.env.example` and `docs/setup.md`, the payload in `tests/Feature/Admin/ReviewsAndAdminTest.php` per Constitution VII/VIII and specs/002 FR-204 (contradicts)
- [ ] T152 CRITICAL: Bring spec-001 intent in line with constitution v2.0.0 via /speckit-specify + /speckit-plan: mark FR-041, the emergency parts of FR-045/FR-072, US6 scenario 3 and the "life-threatening" assumption as superseded by specs/002; update `contracts/api-v1.md` (`POST /urgent-requests` fields, `GET /settings/public`), `quickstart.md` step 7, plan Constitution Check row VII (+ add row VIII) and plan source tree (feature folders, `routes/api/v1/*`) per Constitution VII/VIII (contradicts)
- [ ] T153 Warn the patient when a new booking overlaps one of their own active appointments with another doctor (backend computes the overlap flag; BookingPanel shows a non-blocking notice) per spec Edge Cases/Assumptions "warned, not blocked" (missing)
- [ ] T154 Add an E2E assertion that home → confirmed booking takes ≤ 6 interactions in frontend/tests/e2e/booking.spec.ts per SC-005 (missing)
- [ ] T155 Measure the availability endpoint (14 days) on the ≥ 1,000-doctor seed and record it next to the search timings in docs/database-schema.md per plan Performance Goals (< 300 ms) (partial)
- [ ] T156 Expose the API's `clinic` filter in the doctor search UI (features/directory search filters + URL state) per FR-011 (partial)
- [ ] T157 Email verification UX: acknowledge `/auth/login?verified=1` and offer "resend verification email" (POST /auth/email/verification-notification) to unverified users per FR-002 (partial)
- [ ] T158 Reconcile the pending-confirmation hold default: spec Assumptions say 15 min, `Settings::DEFINITIONS['pending_hold_minutes']` and docs/business-rules.md say 60 — pick one and update the other per FR-028 (contradicts)
- [ ] T159 CRITICAL: Confirm and record the reason for dropping the baseline pages `/dashboard/doctor/patients` and `/dashboard/admin/locations` (no equivalent route or API today), or restore them through the API; docs/implementation-plan.md §8 currently lists them as "reason not recorded" per Constitution VI "removal MUST be documented with its reason" (missing)
