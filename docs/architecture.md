# Architecture

## System boundaries

```
┌──────────── Browser ────────────┐
│ Next.js 16 app (frontend/)      │  same origin: http://localhost:3000
│ React 19 · TanStack Query       │
└──────────────┬──────────────────┘
               │ /api/*  /sanctum/*   (Next.js rewrites → no CORS, first-party cookies)
┌──────────────▼──────────────────┐
│ Laravel 13 API (backend/)       │  http://localhost:8000/api/v1
│ Sanctum SPA session auth        │
│ Controllers → Requests → Actions│
│ Policies · Resources · Events   │
└───┬───────────────┬─────────────┘
    │               │
┌───▼─────────┐ ┌───▼───────────┐   ┌───────────────────────────┐
│PostgreSQL 18│ │ Redis 8       │◄──┤ queue:work (notifications,│
│ btree_gist  │ │ cache · queue │   │ urgent escalation jobs)   │
│ pg_trgm     │ └───────────────┘   │ schedule:work (holds,     │
└─────────────┘                     │ reminders, urgent sweep)  │
                                    └───────────────────────────┘
```

Two applications, one REST contract (`/api/v1`). No microservices. Optional real-time via a Laravel
broadcaster (Reverb) — the UI never depends on it (polling of persisted state is the baseline).

## Responsibilities

| Concern | Owner | Notes |
|---|---|---|
| Business rules, availability, state transitions | Backend | Frontend is untrusted; it only pre-validates for UX. |
| Authorization | Backend | Route middleware (`role`, `permission`, `tenant`) + Policies + checks inside Actions. |
| Data integrity | PostgreSQL | FKs, CHECKs, unique/partial-unique indexes, exclusion constraint. |
| Presentation, i18n (ar/en, RTL/LTR) | Frontend | Server messages are also localized via `Accept-Language`. |
| Time | Both | Stored as UTC `timestamptz`; schedules interpreted in the doctor's timezone (default Africa/Cairo); UI renders in Africa/Cairo. |

## Backend modules (namespaces inside one Laravel app)

| Module | Key classes |
|---|---|
| Identity & Access | `Actions\Auth\RegisterUser`, `Http\Controllers\Api\V1\Auth\*`, `Middleware\{EnsureRole,EnsurePermission,EnsureActiveUser}`, RBAC tables |
| Directory & Search | `Services\Search\{DoctorSearch,ArabicNormalizer}`, `Controllers\Public\*` |
| Doctor practice & verification | `Actions\Doctors\ReviewDoctorVerification`, `Actions\Scheduling\ReplaceWeeklySchedule`, `Controllers\Doctor\{Doctor,Profile,Document,Schedule,Calendar}Controller` |
| Scheduling & Booking | `Services\Scheduling\{AvailabilityCalculator,AvailabilityService}`, `Actions\Booking\{BookAppointment,TransitionAppointment,RescheduleAppointment,ExpireStaleHolds}`, `Enums\AppointmentStatus` |
| Clinics (tenants) | `Middleware\ResolveClinicTenant`, `Controllers\Clinic\*`, `Enums\{ClinicRole,ClinicPermission}` |
| Urgent assistance | `Services\Urgent\{VolunteerMatcher,UrgentDispatcher}`, `Actions\Urgent\{CreateUrgentRequest,UrgentRequestActions,UrgentMessages}`, `Jobs\{DispatchUrgentRequestJob,FinalizeUrgentRequestJob}`, `Controllers\{UrgentRequest,UrgentMessage}Controller`, `Doctor\VolunteerController`, `Public\UrgentAvailabilityController`, `Admin\UrgentLiveController`, `Clinic\ClinicUrgentAvailabilityController` (spec 002) |
| Reviews | `Actions\Reviews\ReviewActions` |
| Notifications | `Notifications\*` (database + mail, queued, after-commit), `Listeners\SendAppointmentNotifications` |
| Admin & Audit | `Controllers\Admin\*`, `Services\Audit\AuditLogger`, `Services\Settings` |

Layering rule: **thin controllers** (HTTP in/out) → **Form Requests** (all validation; none inline in
controllers) → **Action/Service** (one business workflow, owns the transaction) → **Models** (relations, casts, scopes).
Resources shape output per viewer. Domain errors are `BusinessRuleException` (status + machine `code`).

## Project structure (constitution VIII, spec-kit Phase 12)

```
dashbord/
├── backend/                      Laravel API
│   ├── app/
│   │   ├── Actions/<Domain>/      one class per business workflow (owns the transaction):
│   │   │                          Auth · Booking · Clinics · Doctors · Reviews · Scheduling · Urgent
│   │   ├── Console/Commands/      demo:seed, demo:bulk-doctors (non-production only)
│   │   ├── Enums/                 backed enums (single source for statuses/roles)
│   │   ├── Events/ Listeners/ Jobs/ Notifications/
│   │   ├── Exceptions/            BusinessRuleException (HTTP status + machine code)
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/<Area>/   thin: request → action → resource. Areas: Admin · Auth ·
│   │   │   │                      Clinic · Doctor · Public; cross-role endpoints sit at V1/ root
│   │   │   │                      (Appointment, Health, Notification, Patient, Review, UrgentRequest,
│   │   │   │                      UrgentMessage)
│   │   │   ├── Middleware/        EnsureRole · EnsurePermission · EnsureActiveUser · ResolveClinicTenant · SetLocale
│   │   │   ├── Requests/<Area>/   ALL validation (no inline $request->validate in controllers). Areas:
│   │   │   │                      Admin · Appointment · Auth · Clinic · Doctor · Notification · Patient ·
│   │   │   │                      Public · Review · Urgent; Shared/ (ReasonRequest, DateRangeRequest) ·
│   │   │   │                      Concerns/ (ListFilters, LocationRules, AuthorizesAppointmentAccess) ·
│   │   │   │                      Doctor/DoctorRequest base
│   │   │   └── Resources/         output shape per viewer; a resource's RELATIONS const is the single
│   │   │                          eager-load list every controller uses for it (strict mode: no lazy loads)
│   │   ├── Models/  Policies/
│   │   ├── Services/<Domain>/     reusable domain services: Audit · Demo · Scheduling · Search · Urgent;
│   │   │                          Settings.php (platform settings with defaults)
│   │   └── Support/               tiny framework helpers (ApiResponse, Phone, PublicCache, Slug,
│   │                              Database/Constraints)
│   ├── routes/api.php            health (unthrottled) + v1 prefix/throttle; requires routes/api/v1/:
│   │   ├── api/v1/               auth · public (guests) · doctor · patient · urgent · clinic · admin
│   │   │                         (doctor…admin inside the auth:sanctum + active group)
│   │   ├── channels.php          broadcast channel authorization (optional real-time)
│   │   └── console.php           scheduler (holds, urgent sweep, availability refresh, reminders)
│   ├── database/{migrations,factories,seeders/{,Support}}
│   └── tests/{Unit,Feature/<Area>,Database,Concurrency,Concerns}
├── frontend/                     Next.js app (feature-based layout: current since spec-kit T121–T124)
│   ├── src/
│   │   ├── app/                  ROUTES ONLY: a page is either a few lines rendering a feature
│   │   │                         <Name>Screen, or (≤ ~120 lines) simple data wiring + layout;
│   │   │                         layouts wire guards + DashboardShell; providers.tsx fills layout slots
│   │   ├── features/<domain>/    auth · directory (home, search, doctor profile, specialties,
│   │   │   │                     locations) · booking · appointments · patient · doctor · clinic
│   │   │   │                     (dashboard + public clinic directory) · admin · urgent (patient,
│   │   │   │                     volunteer doctor, live board pieces) · notifications · reviews
│   │   │   ├── api.ts            the feature's endpoints (one module)
│   │   │   ├── types.ts          feature-only API shapes and payloads (one module)
│   │   │   ├── hooks/            keys.ts (the feature's query-key set) + TanStack Query hooks
│   │   │   ├── components/       domain UI and <Name>Screen route bodies (each < ~250 lines)
│   │   │   ├── i18n/{ar,en}.ts   the feature's dictionary namespaces
│   │   │   └── index.ts          public surface — app routes and other features import ONLY this
│   │   ├── components/
│   │   │   ├── ui/               shadcn primitives (no domain knowledge)
│   │   │   ├── shared/           cross-domain UI: PageHeader, StatCard, EmptyState, states (Loading/
│   │   │   │                     Error/Section/Skeleton), FormAlert, FormSection, StickySaveBar,
│   │   │   │                     DetailSheet, ConfirmDialog, StatusBadge, DoctorCard, MediaFallback,
│   │   │   │                     PersonAvatar, Pagination, ClientPager, Carousel, IconPanel, PolicyPage
│   │   │   └── layout/           Header, MobileMenu, Footer, MainLayout, LanguageSwitcher, LayoutSlots;
│   │   │                         dashboard/ (DashboardRoot, DashboardShell, Sidebar, SidebarParts,
│   │   │                         TopBar, MobileNav, UserCard, useShellState, nav-types, fallbackNav)
│   │   ├── lib/                  framework glue: api/{client,errors}, auth/{AuthProvider, api (session),
│   │   │                         landing, useAccountActions}, dates, time (useNow/durations), validation
│   │   ├── types/api.ts          envelope, pagination and entities shared across features
│   │   │                         (Appointment, Branch, Service, Specialty, DoctorCard, CurrentUser…)
│   │   └── i18n/                 config/provider/server/translate/format/types; ar.ts/en.ts hold cross-cutting
│   │                             namespaces and spread every feature's i18n/{ar,en}.ts
│   └── tests/                    setup.ts + helpers.tsx (Vitest/Testing Library); unit/ (Vitest);
│                                 e2e/ (Playwright: one playwright.config.ts, 1 worker, per-run output
│                                 dir; e2e/helpers.ts for sessions, API calls, audits + e2e/accounts.ts)
├── infrastructure/               docker-compose.yml (+ postgres/ init)
├── scripts/                      setup-toolchain.sh · dev-services.sh · env.sh · dev.sh
├── docs/                         project documentation (index: README "Documentation")
├── specs/<nnn-feature>/          spec-kit artifacts per feature: spec, plan, tasks, contracts
├── .specify/                     constitution (memory/constitution.md), templates, scripts
└── README.md  CONTRIBUTING.md    entry point · contributor rules (structure, gates, spec-kit workflow)
```

Rules (frontend rules are enforced by `no-restricted-imports` in `frontend/eslint.config.mjs`):
- Dependency direction: `app → features → components/{shared,ui,layout} → lib`. Code outside a
  feature imports it only as `@/features/<x>` (its `index.ts`); inside a feature imports are relative.
  `components/` and `lib/` never import features — feature UI the shell needs (the notification bell)
  is injected by `app/providers.tsx` through `LayoutSlotsProvider`. `src/i18n` is the one place that
  imports feature files directly (`@/features/<x>/i18n/*`). Nothing imports `app/`.
- Feature dependencies form a DAG (no cycles; verified from the imports on 2026-11-17): appointments,
  auth and notifications depend on no feature; booking/reviews → appointments; directory → booking,
  reviews; urgent → auth, directory; doctor → appointments, directory, urgent; patient →
  appointments, auth, booking, directory, notifications, reviews; clinic → appointments, auth,
  booking, directory, doctor, urgent; admin → directory, doctor, reviews, urgent. Composition that
  would close a cycle happens in the route (e.g. the home page passes the urgent banner into
  `HomeScreen`).
- A route file under `app/` stays short; UI and logic live in the feature.
- One API module, one types module, one query-key set per feature; query-key values are stable
  (`['public', …]` survives logout, everything else is dropped by `AuthProvider.logout`).

## Request lifecycle (booking example)

1. Browser `GET /sanctum/csrf-cookie`, then `POST /api/v1/appointments` with `X-XSRF-TOKEN`.
2. Middleware: `SetLocale` → Sanctum stateful session → `auth:sanctum` → `active` → `throttle`.
3. `StoreAppointmentRequest` validates input; `AppointmentController@store` calls `BookAppointment`.
4. `BookAppointment` (one DB transaction): `SELECT … FOR UPDATE` on the doctor row → expire stale
   holds → revalidate slot with `AvailabilityService` (same engine as the availability endpoint) →
   insert appointment + status history → commit. Exclusion-constraint violation (23P01) ⇒ 409.
5. After commit: `AppointmentBooked` event → listener queues notifications (patient, doctor, clinic
   staff) and refreshes `doctor_profiles.next_available_at`.
6. `AppointmentResource` serializes for the viewer; `ApiResponse` wraps it in the envelope.

## Architecture decisions (ADR summary — details in `specs/001-medical-booking-platform/research.md`)

| # | Decision | Why |
|---|---|---|
| R1 | Monorepo `frontend/` + `backend/` | SRS §3; existing app had no real backend |
| R3 | ULID primary keys | Non-enumerable public ids without a mapping layer |
| R4 | Own RBAC tables + per-clinic roles on memberships | SRS table names; tenant roles |
| R5 | Sanctum SPA cookies behind a same-origin proxy | No tokens in JS storage; no CORS/SameSite pitfalls |
| R6 | Row lock + PostgreSQL exclusion constraint | Deterministic 409s + database-level guarantee |
| R7 | Pure availability calculator | Unit-testable; single source for display and booking |
| R9 | PostgreSQL trigram + custom Arabic normalization | No second search engine needed (measured < 10 ms SQL at 2k doctors) |
| R10 | Conditional UPDATE + partial unique index for urgent acceptance | Single winner without distributed locks |
| R11 | Broadcasting optional, polling baseline | Correct when real-time is down |
| R13 | In-house i18n | Avoid restructuring every route for a library |
