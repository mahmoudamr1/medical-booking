# Contributing

Rules for every contributor, human or AI agent. They summarize the constitution
(`.specify/memory/constitution.md`, Principle VIII is non-negotiable) and
[docs/architecture.md](docs/architecture.md) ("Project structure"); those two files win on any conflict.

## Structure rules

**One home per concern. Reuse before writing** — search for an existing component, hook, helper,
Action or Service and extend it; a near-duplicate is a defect.

Frontend (`frontend/src`)
- `app/` holds thin routes only: a page renders a feature `<Name>Screen` or does a few lines of wiring.
- Each domain lives in `features/<domain>/` with exactly one `api.ts`, one `types.ts`, `hooks/`
  (incl. `keys.ts`, the feature's query keys), `components/`, `i18n/{ar,en}.ts` and `index.ts`.
- Shared UI lives in `components/{ui,shared,layout}`; framework glue in `lib/`; dictionaries are
  assembled in `i18n/`.
- Dependency direction is `app → features → components/{shared,ui,layout} → lib`. Outside a feature,
  import it only through `@/features/<x>` (its `index.ts`); inside it, use relative imports.
  `components/` and `lib/` never import features. ESLint (`no-restricted-imports` in
  `frontend/eslint.config.mjs`) enforces this — do not disable the rule.
- Components stay under ~250 lines; split into subcomponents/hooks beyond that.
- Every async screen has loading, empty, error (with retry) and success states; every string exists
  in both `ar` and `en`.

Backend (`backend/`)
- Thin controllers: Form Request → Action/Service → API Resource. No business logic in controllers.
- ALL validation lives in Form Requests under `app/Http/Requests/<Area>/` — never inline
  `$request->validate()`.
- One Action (`app/Actions/<Domain>/`) per business workflow, owning its transaction; reusable domain
  logic goes in `app/Services/<Domain>/`. Side effects dispatch after commit.
- Routes go in `routes/api/v1/<area>.php`. Domain errors are `BusinessRuleException` with a machine
  code; responses use the `ApiResponse` envelope.
- The backend owns every business rule and authorization decision; critical invariants are also
  enforced by PostgreSQL constraints.

Both
- No `any`, no `@ts-ignore` without a written reason, no dead or commented-out code, no unused
  exports, no inline fully-qualified class names in PHP, no magic strings where an enum exists.
- No new dependency without checking that Laravel or the existing frontend packages do not already
  cover the need.

## Quality gates

A task is done only when its gates and tests pass.

```bash
# backend/   (Git Bash: source ../scripts/env.sh first when using the portable toolchain)
php artisan test                # runs against the test database, never the dev database
vendor/bin/phpstan analyse
vendor/bin/pint --test

# frontend/
npm run typecheck
npm run lint
npm run format:check
npx vitest run
NEXT_DIST_DIR=.next-build npm run build   # keeps a running dev server's .next intact
npx playwright test                       # needs the running stack with demo data
```

New behaviour needs tests at the right layer: PHPUnit unit/feature tests, database-constraint tests,
multi-process concurrency tests for booking and urgent acceptance, tenant-isolation tests, Vitest
for frontend logic, Playwright for critical flows.

## Spec-kit workflow

Work is tracked as tasks in `specs/<feature>/tasks.md`.

1. `/speckit-specify` — what and why (`spec.md`)
2. `/speckit-plan` — how (`plan.md`, research, data model, contracts)
3. `/speckit-tasks` — ordered, traceable tasks (`tasks.md`)
4. `/speckit-implement` — build; tick a task only with evidence (file paths, test names)
5. `/speckit-analyze` — spec/plan/tasks consistency report (read-only)
6. `/speckit-converge` — code vs. spec gaps appended as new tasks; repeat from 4 until converged

A changed principle is a constitution amendment with a version bump, never a silent exception.
When several agents work in parallel, each brief names the paths it owns; two writers never own the
same path at the same time.

## Secrets and data

- No secrets in the repository: configuration comes from environment variables, `.env` is never
  committed, `.env.example` stays complete.
- Synthetic data only (`@example.test` accounts); never real patient or personal data in seeds,
  fixtures, tests, screenshots or logs.
- No tokens or credentials in `localStorage`; sessions are Sanctum HTTP-only cookies.
- No emergency-number redirect in the urgent flow (constitution Principle VII).
- Commits and branches are created only when the maintainer asks.
