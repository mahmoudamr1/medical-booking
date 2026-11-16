# Medical Booking Platform

A healthcare appointment marketplace for Egypt: patients find verified doctors and clinics and book
real time slots; doctors and clinics manage schedules and appointments; verified doctors who are
available right now take **live urgent consultations**; administrators verify doctors and oversee the platform.
Arabic (RTL) first, English (LTR) supported. Academic build — **synthetic data only**.

## Stack
| Layer | Technology |
|---|---|
| Frontend (`frontend/`) | Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, Radix UI, TanStack Query, React Hook Form + Zod, date-fns, lucide-react |
| Backend (`backend/`) | PHP 8.4, Laravel 13, Sanctum (SPA cookies), Eloquent, Form Requests, API Resources, Policies, Events/Queues/Notifications, Scheduler, PHPUnit |
| Data | PostgreSQL 18 (`btree_gist` exclusion constraint, `pg_trgm` search), Redis (cache + queue) |

## Features
- Discovery: specialties, server-side doctor search (name incl. Arabic normalization, specialty, governorate/city/area, clinic, price, rating, consultation type, available date), clinic directory, public profiles with reviews.
- Booking engine: per-service durations, breaks, buffers, exceptions/holidays, lead time, horizon; dynamic availability; **database-enforced double-booking prevention**; instant or manual confirmation with expiring holds; cancellation policy; atomic rescheduling; full status history.
- Doctor dashboard: overview, calendar, schedules, services/prices, preferences, verification documents.
- Clinics: multi-branch organizations, staff invitations with roles, doctor affiliations, appointments, booking on behalf, reports — strict tenant isolation.
- Live urgent consultation (spec 002): live list of doctors available now, severity (critical = one immediate wave to every eligible doctor), directed or broadcast requests with automatic fallback, consent, **atomic first-acceptance**, privacy redaction until acceptance, in-request messaging, outcome note, admin live board, abuse limits. No emergency-number redirect (constitution Principle VII).
- Reviews with moderation; admin dashboard with live statistics, verification, users, clinics, appointments, urgent oversight, audit logs, settings.
- Notifications (database + email when configured), queued after commit; scheduled reminders.

## Quick start
See **[docs/setup.md](docs/setup.md)** (Windows portable toolchain or Docker).
```bash
bash scripts/setup-toolchain.sh && bash scripts/dev-services.sh start && source scripts/env.sh
cd backend && composer install && cp .env.example .env && php artisan key:generate && php artisan migrate:fresh --seed && php artisan serve
cd frontend && npm install && npm run dev   # http://localhost:3000
```

## Project structure
```
backend/    Laravel API — app/{Actions,Services}/<Domain> hold workflows; Http/Controllers/Api/V1/<Area> stay thin;
            Http/Requests/<Area> hold ALL validation; routes/api/v1/<area>.php per area; tests/{Unit,Feature,Database,Concurrency}
frontend/   Next.js app — src/app = thin routes; src/features/<domain>/{api.ts,types.ts,hooks,components,i18n,index.ts};
            src/components/{ui,shared,layout}; src/lib (api client, auth); src/i18n; tests/{unit,e2e}
docs/  specs/  .specify/  infrastructure/  scripts/
```
Full layout and dependency rules: [docs/architecture.md](docs/architecture.md#project-structure-constitution-viii-spec-kit-phase-12). Contribution rules: [CONTRIBUTING.md](CONTRIBUTING.md).

## Quality gates
A task is done only when its gates pass (constitution Principle VIII).
```bash
# backend/
php artisan test                    # unit, feature, database-constraint and multi-process concurrency tests (test DB)
vendor/bin/phpstan analyse          # Larastan (level in phpstan.neon)
vendor/bin/pint --test              # code style

# frontend/
npm run typecheck                   # tsc --noEmit (strict)
npm run lint                        # ESLint incl. feature dependency-direction rules
npm run format:check                # Prettier
npx vitest run                      # unit tests (= npm test)
NEXT_DIST_DIR=.next-build npm run build   # production build without clobbering a running dev server's .next
npx playwright test                 # E2E against the running stack with demo data (= npm run test:e2e)
```

## Demo Accounts (development only)
Create or update them with **`php artisan demo:seed`** (in `backend/`; refuses to run in production).
Full reset: `php artisan demo:seed --fresh`. Details, permissions and test data: **[docs/DEMO-ACCOUNTS.md](docs/DEMO-ACCOUNTS.md)**.

| Role | Email | Password | Dashboard |
|---|---|---|---|
| Admin | admin@example.test | `Demo-GGH0Z6zRKs!` | http://localhost:3000/dashboard/admin |
| Patient | patient@example.test | `Demo-AxXlsaoJM4!` | http://localhost:3000/dashboard/patient |
| Verified doctor | dr.karim@example.test | `Demo-PUoLRPjAHp!` | http://localhost:3000/dashboard/doctor |
| Volunteer doctor | dr.volunteer@example.test | `Demo-hlUMkMhiOf!` | http://localhost:3000/dashboard/doctor/urgent |
| Pending doctor | dr.pending@example.test | `Demo-7ANWis8nIA!` | http://localhost:3000/dashboard/doctor/verification |
| Clinic owner | clinic.owner@example.test | `Demo-hYkWzO43sg!` | http://localhost:3000/dashboard/clinic |
| Receptionist | reception@example.test | `Demo-Ws6Yu7zXIW!` | http://localhost:3000/dashboard/clinic |

Supporting accounts (patient2, other doctors, clinic2.owner) use `Demo-RiHnPunOQz!`.

## Run everything in one terminal
`dev.bat` (double-click) or `bash scripts/dev.sh` → http://localhost:3000

## Documentation
| Topic | Document |
|---|---|
| Getting started | [Setup](docs/setup.md) · [Demo accounts](docs/DEMO-ACCOUNTS.md) · [User guide](docs/user-guide.md) · [Troubleshooting](docs/troubleshooting.md) |
| Design | [Architecture & project structure](docs/architecture.md) · [Database schema](docs/database-schema.md) · [Business rules](docs/business-rules.md) · [Security](docs/security.md) |
| API | [API documentation](docs/api-documentation.md) · [OpenAPI description](docs/openapi.yaml) |
| Running it | [Deployment](docs/deployment.md) · [Operations](docs/operations.md) |
| Project | [Contributing](CONTRIBUTING.md) · [Implementation plan & checklist](docs/implementation-plan.md) |
| Spec-Kit | [001 Medical booking platform](specs/001-medical-booking-platform/) · [002 Live urgent consultation](specs/002-urgent-live-consultation/) · [003 Production readiness](specs/003-production-readiness/) · [Constitution](.specify/memory/constitution.md) |
