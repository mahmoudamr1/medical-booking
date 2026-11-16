<!--
Sync Impact Report
- Version: 1.1.0 -> 2.0.0 (MAJOR: Principle VII redefined); 2.0.1 (PATCH: Prettier added to VIII gates); 2.1.0 (MINOR: feature-based structure rule)
- Modified principle: VII "Safety in Urgent Assistance" -> "Live Urgent Consultation, Done Safely"
  (removes the mandatory emergency-number redirect; critical cases are routed to live doctors)
- Earlier in this version line: VIII Clean, Simple, Reusable Code added (1.1.0)
- Dependent artifacts: specs/001 FR-041 superseded by specs/002-urgent-live-consultation
- Follow-up: implement 002 tasks; update docs/business-rules.md and docs/security.md
-->
# Medical Booking Platform Constitution

## Core Principles

### I. Backend Owns the Truth (NON-NEGOTIABLE)

All business rules, authorization decisions, availability calculation, and state transitions MUST
live in the Laravel API. The Next.js frontend is an untrusted client: it MAY pre-validate for UX,
but every rule MUST be re-enforced server-side. No authorization exists only as a hidden button.
No business rule exists only in a React component.

### II. Database-Enforced Integrity

Critical invariants MUST be enforced by PostgreSQL, not only by application code:
foreign keys, unique and check constraints, non-negative prices, valid periods, one review per
appointment, an exclusion constraint (`btree_gist`, half-open `[starts_at, ends_at)`) preventing
overlapping active appointments for the same doctor, and a single winning acceptance per urgent
request. Application checks are the first line; the database is the last.

### III. Tested Workflows, Not Screens (NON-NEGOTIABLE)

A feature is done only when its full workflow works end-to-end, permissions are enforced, data
persists correctly, and automated tests pass. Required: PHPUnit unit + feature tests per module,
database constraint tests, concurrency tests using separate DB connections for booking and urgent
acceptance, cross-tenant isolation tests, and frontend tests for critical flows. A phase is not
complete while its tests fail. Mock data MUST NOT stand in for real functionality.

### IV. Least Privilege, Privacy by Design

Roles and permissions are relational (users may hold multiple roles); a single `role` string is
forbidden. Clinic data is tenant-scoped at the query/policy level. Health data is sensitive
personal data (Egypt PDPL No. 151/2020): collect the minimum, reveal patient contact details to a
volunteer doctor only after acceptance and consent, store verification documents in private
storage with ownership checks, audit-log sensitive access and admin actions. Sessions use
Sanctum HTTP-only cookies; no tokens or credentials in localStorage. Seed data is synthetic only.

### V. Simple Modular Monolith

One Laravel API (`backend/`) and one Next.js app (`frontend/`) communicating over versioned REST
(`/api/v1`). Organize by domain module. Controllers stay thin; Form Requests validate; Actions/
Services hold reusable workflows; Policies authorize; API Resources serialize. No microservices,
no forwarding-only service classes, no second search engine before PostgreSQL search is measured
insufficient. Side effects (notifications, emails) dispatch after commit via queues.

### VI. Preserve, Then Improve

The existing Next.js 16 / React 19 / Tailwind 4 / Radix / TanStack Query / lucide frontend is kept.
Existing pages are rewired to the real API rather than rewritten from a template. Removal of any
existing functionality MUST be documented with its reason in the implementation plan.

### VII. Live Urgent Consultation, Done Safely

Urgent assistance connects a patient who needs an urgent (possibly life-saving) medical consultation
directly with verified doctors who are available right now. Every severity, including "critical",
is routed to live doctors; critical requests are broadcast to all eligible available doctors at
once with the shortest timeouts. The flow MUST NOT redirect patients away to an external number
instead of connecting them (product decision, 2026-11-16). Safety still applies: only verified,
opted-in, currently-available doctors; the patient's self-reported severity is never presented as
a diagnosis; no AI diagnosis or automated triage; no fake response guarantees (show live counts and
real waiting time); availability is opt-in, time-bounded, and auto-expires; contact details and
location are revealed only to the accepted doctor; every access and decision is audit-logged.

### VIII. Clean, Simple, Reusable Code (NON-NEGOTIABLE)

No spaghetti or ad-hoc code. Every change MUST follow these rules:

- **Reuse before writing**: search for an existing component, hook, helper, Action or Service and
  extend it instead of creating a near-duplicate. Copy-pasted logic or UI is a defect.
- **One home per concern / feature-based structure**: each frontend domain lives in
  `src/features/<domain>/` with exactly one `api.ts`, one `types.ts`, its hooks, components and
  i18n, exposed through `index.ts`; `src/app/` holds thin routes only; shared UI lives in
  `src/components/{ui,shared,layout}`. Backend: one Action/Service per workflow, all validation in
  Form Requests, routes split per area. Dependency direction and the full layout are defined in
  `docs/architecture.md` ("Project structure").
- **Small, single-responsibility files**: React components SHOULD stay under ~250 lines (split into
  subcomponents/hooks beyond that); controllers stay thin (validate → call action → return
  resource); no "god" files mixing domains.
- **No dead weight**: no `any`, no `@ts-ignore` without a written reason, no dead or commented-out
  code, no unused exports, no inline fully-qualified class names in PHP (import them), no magic
  strings where an enum/constant exists.
- **Consistent naming and structure** across modules (same patterns for hooks, queries, forms,
  resources, requests).
- **Quality gates**: PHP — Laravel Pint and PHPStan (Larastan) at the configured level; TypeScript
  — `tsc --noEmit` (strict), ESLint with zero errors and Prettier (`npm run format:check`). A task is not done until its gates and
  tests pass.

Rationale: multiple contributors (human and AI agents) work in parallel; without strict reuse and
single ownership the codebase fragments into duplicated, inconsistent modules.

## Technology & Quality Constraints

- Backend: PHP 8.4, Laravel 13, Sanctum (SPA cookie auth), PHPUnit, PostgreSQL 18, Redis.
- Frontend: Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS, React Hook Form +
  Zod, TanStack Query, date-fns, lucide-react (single icon system).
- Arabic (RTL) is the default locale, English (LTR) fully supported; timezone Africa/Cairo; EGP.
- API envelope: `{ success, message, data }`; errors `{ success:false, message, errors }`; HTTP
  status codes per spec (409 for business conflicts, 422 validation, 429 rate limit). No stack
  traces to clients. Public resources expose ULIDs, never internal sequential IDs.
- Every async screen has loading, empty, error (with retry), and success states.
- Secrets only via environment variables; `.env` never committed; `.env.example` complete.

## Development Workflow & Quality Gates

- Work follows the phases in `docs/implementation-plan.md` and tasks in `specs/*/tasks.md`.
- After each phase: run backend tests (`php artisan test`), frontend typecheck/lint/tests/build,
  fix failures before proceeding, update docs and the checklist.
- Work is tracked as Spec Kit tasks in `specs/*/tasks.md`. After an implementation round, run
  `/speckit-analyze` (spec/plan/tasks consistency) and `/speckit-converge` (code vs. spec gaps
  appended as tasks) before declaring the feature complete.
- Delegated agents MUST receive the Principle VIII rules and explicit file ownership in their brief;
  two writers never own the same path at the same time.
- Version control actions (branches, commits) are performed only when the user asks.
- New packages require a compatibility check and justification that Laravel / existing frontend
  deps do not already cover the need.

## Governance

This constitution supersedes ad-hoc practice. Amendments require updating this file with a version
bump (semantic: MAJOR for principle removal/redefinition, MINOR for added principles/sections,
PATCH for clarifications) and noting the impact on plan and tasks. Every plan's Constitution Check
MUST pass or record a justified exception in its Complexity Tracking table. Runtime development
guidance lives in `docs/` and `CLAUDE.md`.

**Version**: 2.1.0 | **Ratified**: 2026-11-16 | **Last Amended**: 2026-11-16
