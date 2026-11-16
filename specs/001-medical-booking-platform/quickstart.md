# Quickstart & Validation

## Prerequisites
Either Docker (`infrastructure/docker-compose.yml`) **or** the portable toolchain:

```bash
bash scripts/setup-toolchain.sh      # downloads PHP 8.4, Composer, PostgreSQL 18, Redis into .tools/
bash scripts/dev-services.sh start   # initdb on first run, starts Postgres :5432 and Redis :6379
source scripts/env.sh                # puts .tools binaries on PATH for this shell
```

## Backend
```bash
cd backend
cp .env.example .env && php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve --port=8000        # API: http://localhost:8000/api/v1/health
php artisan queue:work               # separate shell
php artisan schedule:work            # separate shell
php artisan test                     # full suite (uses medical_booking_test DB)
```

## Frontend
```bash
cd frontend
npm ci
npm run dev                          # http://localhost:3000 (proxies /api and /sanctum to :8000)
npm run typecheck && npm run lint && npm test && npm run build
npx playwright test                  # E2E (stack must be running with seed data)
```

## Validation scenarios (expected outcomes)
1. `GET /api/v1/health` → `{"status":"ok","database":"ok","redis":"ok"}`.
2. Login as demo patient → `GET /api/v1/auth/me` returns roles `["patient"]`.
3. Search `/search?specialty=cardiology` → only verified doctors; open a profile; pick tomorrow;
   book → appears under Upcoming; same slot disappears from availability.
4. `php artisan test --filter=Concurrency` → 1 success / N-1 conflicts for booking and urgent accept.
5. Login as demo doctor (manual mode) → pending appointment visible → confirm → patient notified.
6. Login as clinic A receptionist → requesting clinic B appointment id → 404.
7. Urgent assistance with "life-threatening" → emergency warning + 123 shown, no request created.
8. Admin approves pending doctor → doctor appears in search; audit log entry present.

Demo accounts: see `README.md` (development only, synthetic data).
