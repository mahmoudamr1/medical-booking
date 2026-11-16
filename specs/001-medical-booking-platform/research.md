# Research & Decisions: Medical Booking Platform

Each entry: **Decision / Rationale / Alternatives considered**.

## R1. Repository layout

- **Decision**: Monorepo with `frontend/` (existing Next.js app moved with `git mv`, history kept)
  and `backend/` (new Laravel 13). `infrastructure/docker-compose.yml`, `docs/`, `scripts/`.
- **Rationale**: SRS §3 recommends it; the existing app has no backend worth keeping (Next API
  routes run on an in-memory `LocalDatabase` with plaintext passwords).
- **Alternatives**: Keep Next at root + `backend/` sibling — rejected, mixes two toolchains' configs
  at root (eslint/tsconfig would crawl `backend/`).

## R2. Local runtime without Docker

- **Decision**: Portable toolchain in `.tools/` via `scripts/setup-toolchain.sh` (PHP 8.4.27 NTS,
  Composer, PostgreSQL 18.4 binaries, Redis 8 Windows build) + `scripts/dev-services.sh` to
  init/start/stop Postgres and Redis. `infrastructure/docker-compose.yml` for Docker users.
- **Rationale**: Machine has neither Docker nor PHP/Postgres; user chose project-local install.

## R3. Primary keys & public identifiers

- **Decision**: ULID primary keys (`HasUlids`) for all domain entities; append-only internal tables
  (status histories, audit logs, dispatches, role/permission pivots) use `bigIncrements`.
- **Rationale**: One identifier per entity, non-enumerable in URLs, no internal/public mapping
  layer. Satisfies "consistent" + "no predictable IDs as boundary".
- **Alternatives**: bigint + `public_id` ULID — rejected: every FK in request payloads would need
  translation; more code, same security.

## R4. Roles & permissions

- **Decision**: Own tables `roles`, `permissions`, `role_permissions`, `user_roles` (platform roles:
  patient, doctor, admin). Clinic-scoped roles live on `clinic_memberships.role`
  (owner/manager/receptionist) with a static permission map in `App\Enums\ClinicRole`. Gate
  `before` grants admins; Policies check permission + ownership + tenant.
- **Rationale**: SRS names these exact tables; clinic roles are per-tenant, which global role
  tables model poorly. No package needed.
- **Alternatives**: spatie/laravel-permission with teams — rejected: different table names, extra
  dependency, team-mode friction with users in multiple clinics.

## R5. Authentication

- **Decision**: Sanctum SPA cookie auth. Next.js `rewrites` proxy `/api/*` and `/sanctum/*` to
  Laravel so the browser sees a single origin (`localhost:3000`). `SANCTUM_STATEFUL_DOMAINS=
  localhost:3000`, CORS `supports_credentials=true` for direct access. Session driver `database`.
  Login throttled 5/min per email+IP. Email verification + password reset via Laravel built-ins;
  mail driver `log` locally.
- **Rationale**: SRS §6 mandates cookie SPA auth; same-origin proxy removes SameSite/CORS pitfalls
  in dev and works behind a single production domain.
- **Server components**: protected pages are client components using TanStack Query; no session
  cookie is read by JS. Middleware only checks presence of the session cookie for redirects (UX);
  the API remains authoritative.

## R6. Double-booking prevention

- **Decision**: `appointments.blocked_until = ends_at + buffer` stored explicitly (CHECK
  `blocked_until >= ends_at > starts_at`). Exclusion constraint:
  `EXCLUDE USING gist (doctor_profile_id WITH =, tstzrange(starts_at, blocked_until, '[)') WITH &&)
  WHERE (status IN ('pending_confirmation','confirmed'))`. Booking action: transaction →
  `SELECT … FOR UPDATE` on the doctor profile row (serializes per doctor) → expire stale holds →
  revalidate slot against availability engine → insert → history row → commit → dispatch events
  `afterCommit`. A `23P01` exclusion violation is mapped to `BookingConflictException` → 409.
- **Rationale**: Constraint is the final guarantee; the row lock gives deterministic 409s instead
  of relying solely on constraint errors. Generated columns can't be used (timestamptz + interval
  is STABLE, not IMMUTABLE).
- **Concurrency testing**: `tests/Concurrency` spawn N PHP processes via `Process::pool` running a
  test-only artisan command (`testing:book`) that calls the same Action on its own DB connection,
  synchronized on a start timestamp; tests use committed data (DatabaseTruncation), not
  transaction rollback.

## R7. Availability engine

- **Decision**: Pure PHP `AvailabilityCalculator` (no DB access) given schedule rules, breaks,
  exceptions, busy periods, service duration, buffer, lead time, horizon, `now`, timezone →
  list of slots. `AvailabilityService` loads data and calls it. Slot step = service duration +
  buffer (Clinido-like fixed grid from window start).
- **Rationale**: Unit-testable domain logic, single source for search "next available" and booking
  revalidation.

## R8. Status transitions

- **Decision**: `AppointmentStatus` backed enum with `allowedTransitions()` and
  `canTransitionTo()`; `AppointmentStateMachine` action performs transition + history + actor
  authorization (which actor kinds may perform which transition).

## R9. Search

- **Decision**: PostgreSQL `pg_trgm` + `unaccent`-free custom normalization: a `search_text`
  column on `doctor_profiles` maintained by the app (`ArabicNormalizer`: strip tashkeel/tatweel,
  unify أ/إ/آ→ا, ة→ه, ى→ي, lowercase Latin, collapse spaces). GIN trigram index on it. Filters
  with B-tree indexes; `rating_avg`, `min_price`, `next_available_at` are denormalized onto
  `doctor_profiles` and refreshed by events/scheduler for sorting.
- **Alternatives**: Meilisearch/Elasticsearch — rejected by SRS for basic discovery.

## R10. Urgent acceptance atomicity

- **Decision**: Conditional update `UPDATE urgent_requests SET status='accepted',
  accepted_doctor_profile_id=?, accepted_at=now() WHERE id=? AND status IN ('searching',
  'notifying')` inside a transaction; 0 rows → 409. Partial unique index on
  `urgent_request_dispatches(urgent_request_id) WHERE status='accepted'` as the DB guarantee, and
  CHECK on urgent_requests that accepted status ⇔ accepted doctor not null.
- **Matching job**: `DispatchUrgentRequestJob(request, group)` selects eligible volunteers for the
  tier, creates dispatches, notifies, and schedules itself (`delay(timeout)`) for the next tier;
  idempotent (no-op if request no longer searching/notifying). Final tier timeout → `unmatched`.

## R11. Real-time

- **Decision**: Broadcast events on private channels (`users.{id}`, `urgent-requests.{id}`)
  authorized in `routes/channels.php`. Default `BROADCAST_CONNECTION=log`; Reverb is optional
  (documented). Frontend polls urgent request status every 5 s while active (required fallback).
- **Rationale**: SRS requires correctness without real-time; avoids an extra always-on process for
  the academic deployment.

## R12. Notifications & queues

- **Decision**: Laravel Notifications with `database` + `mail` channels (mail only if
  `MAIL_MAILER` ≠ `log`/configured). Queue connection `redis` in dev, `sync` in tests. Notifications
  implement `ShouldQueue` and `afterCommit`. Scheduler: expire holds (every minute), expire
  volunteer windows (every minute), appointment reminders (every 15 min, idempotent via
  `reminded_at`), urgent timeouts handled by delayed jobs + sweeper.

## R13. Frontend i18n

- **Decision**: Small in-house i18n: `frontend/src/i18n/{ar,en}.ts` dictionaries, locale in a
  `locale` cookie, root layout sets `<html lang dir>` server-side, `useT()` hook client-side,
  `Intl` for dates/numbers. No new dependency.
- **Alternatives**: next-intl — viable, but adds routing segment changes to every existing page;
  rejected for simplicity.

## R14. Frontend forms & tests

- **Decision**: Add `react-hook-form`, `zod`, `@hookform/resolvers`. Tests: `vitest` +
  `@testing-library/react` + `jsdom` for components/hooks; `@playwright/test` for critical E2E
  flows against the running stack.

## R15. File uploads

- **Decision**: `local` private disk (`storage/app/private/verification/{doctor}/{ulid}.{ext}`),
  Form Request rule `mimetypes:application/pdf,image/jpeg,image/png|max:5120`, streamed download
  through a policy-checked controller; never via `public` disk.
