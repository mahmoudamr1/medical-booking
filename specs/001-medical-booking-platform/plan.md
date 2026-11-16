# Implementation Plan: Medical Booking Platform

**Branch**: `main` (uncommitted working tree) | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-medical-booking-platform/spec.md`; full SRS in
`claude/plan.md`. Human-facing roadmap and repository audit: `docs/implementation-plan.md`.

## Summary

Replace the current in-memory/PocketBase pseudo-backend with a Laravel 13 modular-monolith API on
PostgreSQL 18 (Sanctum cookie auth, relational RBAC, tenant-scoped clinics, a database-enforced
booking engine, an atomic volunteer-matching module, notifications, audit logging), and rewire
the existing Next.js 16 frontend (moved to `frontend/`) to it with Arabic/English i18n and
complete patient, doctor, clinic, admin, and urgent-assistance flows. Tests at every layer.

## Technical Context

**Language/Version**: PHP 8.4 (backend), TypeScript 5 strict / Node 24 (frontend)
**Primary Dependencies**: Laravel 13, Sanctum; Next.js 16.0, React 19.2, Tailwind 4, Radix UI,
TanStack Query 5, date-fns 4, lucide-react, react-hook-form + zod (new)
**Storage**: PostgreSQL 18 (`btree_gist`, `pg_trgm`), Redis 8 (cache/queue), private local disk
**Testing**: PHPUnit 12 via `php artisan test` (Postgres test DB), Vitest + Testing Library,
Playwright E2E
**Target Platform**: Linux server / Windows dev; modern browsers, mobile-first responsive
**Project Type**: Web application (separate frontend + backend over REST `/api/v1`)
**Performance Goals**: search p95 < 500 ms on ≥1,000 doctors; availability for 14 days < 300 ms
**Constraints**: no double booking under concurrency; no cross-tenant leakage; no secrets in repo;
no paid services required; works without real-time (polling fallback)
**Scale/Scope**: ~35 tables, ~120 endpoints, ~40 screens, 7 roles/actors

## Constitution Check

| Principle | Gate | Status |
|---|---|---|
| I Backend owns truth | All rules in Laravel Actions/Policies; Next API routes deleted | PASS (planned) |
| II DB integrity | Exclusion constraint, partial unique on accepted dispatch, CHECKs, FKs | PASS |
| III Tested workflows | Unit/feature/DB/concurrency/isolation + Vitest + Playwright per phase | PASS |
| IV Least privilege/privacy | Relational RBAC, tenant middleware, private docs, redaction, audit | PASS |
| V Simple monolith | Two apps, no extra services beyond Postgres/Redis; Reverb optional | PASS |
| VI Preserve, then improve | Frontend moved with `git mv`; pages rewired, design kept | PASS |
| VII Urgent safety | Emergency gate before matching, configurable 123, no triage | PASS |

Post-design re-check: PASS — no violations; Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-medical-booking-platform/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/api-v1.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/                         # Laravel 13
├── app/
│   ├── Actions/{Auth,Booking,Doctors,Clinics,Urgent,Reviews,Admin}/
│   ├── Enums/                   # AppointmentStatus, UrgentStatus, ClinicRole, VerificationStatus…
│   ├── Events/  Listeners/  Jobs/  Notifications/
│   ├── Exceptions/              # DomainException → envelope mapping (409 etc.)
│   ├── Http/{Controllers/Api/V1/{Public,Patient,Doctor,Clinic,Admin},Middleware,Requests,Resources}/
│   ├── Models/  Policies/
│   ├── Services/{Scheduling,Search,Audit}/   # AvailabilityCalculator, ArabicNormalizer, AuditLogger
│   └── Support/ApiResponse.php
├── database/{migrations,factories,seeders}/
├── routes/{api.php,channels.php,console.php}
└── tests/{Unit,Feature,Database,Concurrency}/
frontend/                        # existing Next.js app (moved)
├── src/app/…                    # existing routes, rewired; new: clinics, urgent, dashboard/clinic
├── src/components/{ui,layout,calendar,doctors,appointments,…}
├── src/features/{auth,booking,doctor,clinic,admin,urgent}/   # hooks + api calls per domain
├── src/lib/api/                 # fetch client (credentials, CSRF, envelope, errors)
├── src/i18n/                    # ar/en dictionaries, provider
├── src/types/                   # API types
└── tests/{unit,e2e}/
infrastructure/docker-compose.yml
scripts/{setup-toolchain.sh,dev-services.sh,env.sh}
docs/{implementation-plan,architecture,database-schema,api-documentation,business-rules,security,setup}.md
```

**Structure Decision**: Web application with `backend/` + `frontend/` per SRS §3 (see research R1).

## Delivery phases

Mirrors SRS §24; detailed tasks in `tasks.md`, acceptance in `docs/implementation-plan.md`.
0 Audit → 1 Backend foundation → 2 Core domain → 3 Verification & directory → 4 Scheduling engine
→ 5 Patient & doctor apps → 6 Clinic management → 7 Urgent assistance → 8 Reviews & admin →
9 Security & QA → 10 Delivery.

## Complexity Tracking

None.
