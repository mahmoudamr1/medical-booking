# Setup

## Versions
PHP 8.4 · Composer 2 · Laravel 13 · PostgreSQL 18 (extensions `btree_gist`, `pg_trgm`) · Redis 7/8 ·
Node.js ≥ 20.9 (tested 24) · npm.

## Option A — Windows without Docker (portable, project-local toolchain)

```bash
# Git Bash, from the repository root
bash scripts/setup-toolchain.sh        # downloads PHP 8.4, Composer, PostgreSQL 18, Redis into .tools/ (git-ignored)
bash scripts/dev-services.sh start     # first run: initdb, role medical_user, DBs medical_booking + medical_booking_test, extensions
source scripts/env.sh                  # puts php, composer, psql, redis-cli on PATH for this shell

cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed       # schema + roles + Egypt geography + specialties + demo data
php artisan serve --port=8000          # terminal 1: API
php artisan queue:work --queue=urgent,default   # terminal 2: notifications, urgent escalation
php artisan schedule:work              # terminal 3: holds, reminders, urgent sweep

cd ../frontend
npm install
npm run dev                            # http://localhost:3000 (proxies /api and /sanctum to :8000)
```
Stop services: `bash scripts/dev-services.sh stop`. Status: `… status`.

## Option B — Docker
```bash
cp backend/.env.example backend/.env    # then set APP_KEY (php artisan key:generate --show) or run inside the container
docker compose -f infrastructure/docker-compose.yml up --build
docker compose -f infrastructure/docker-compose.yml exec backend php artisan db:seed --force
```
Services: postgres:18, redis:8, backend (:8000), queue, scheduler, frontend (:3000).

## Environment variables (backend/.env)
| Variable | Purpose |
|---|---|
| `APP_KEY`, `APP_ENV`, `APP_DEBUG`, `APP_URL`, `FRONTEND_URL` | App; frontend URL is used in emails (reset/verify links) |
| `APP_TIMEZONE=UTC`, `BUSINESS_TIMEZONE=Africa/Cairo` | Storage in UTC; schedules/display in Cairo |
| `APP_LOCALE=ar`, `APP_FALLBACK_LOCALE=en` | Default API message language |
| `DB_*` | PostgreSQL (`DB_CONNECTION=pgsql`) |
| `SESSION_DRIVER=database`, `SESSION_ENCRYPT=true`, `SESSION_DOMAIN`, `SESSION_SECURE_COOKIE`, `SESSION_SAME_SITE` | Session cookie |
| `SANCTUM_STATEFUL_DOMAINS`, `CORS_ALLOWED_ORIGINS` | SPA origins |
| `CACHE_STORE=redis`, `QUEUE_CONNECTION=redis`, `REDIS_CLIENT=predis`, `REDIS_*` | Cache/queue |
| `MAIL_*` | `log` locally; SMTP in production |
| `BROADCAST_CONNECTION` | `log`/`null` by default; `reverb` if real-time is enabled |
| `EMERGENCY_NUMBER` | Default emergency number (overridable in admin settings) |

Frontend: `API_ORIGIN` (default `http://localhost:8000`) — where Next.js proxies `/api` and `/sanctum`.

## Tests
```bash
cd backend && php artisan test                 # all suites (Unit, Feature, Database, Concurrency) against medical_booking_test
php artisan test --testsuite=Concurrency       # multi-process booking + urgent acceptance races
vendor/bin/pint --test                         # code style
cd ../frontend && npm run typecheck && npm run lint && npm test && npm run build
npx playwright test                            # E2E (requires the running stack with demo seed)
```

## Demo data
`php artisan demo:seed` (idempotent; `--fresh` for a full reset) creates the seven role accounts and test data.
Credentials and details: [DEMO-ACCOUNTS.md](DEMO-ACCOUNTS.md). Performance dataset: `php artisan demo:bulk-doctors 2000` (non-production only).

## Production deployment checklist
- `APP_ENV=production`, `APP_DEBUG=false`, strong unique `APP_KEY`, real DB/Redis credentials (never the dev defaults).
- HTTPS everywhere; frontend and API under the same site (e.g. `app.example.eg` + `api.example.eg`, or a single
  domain with the proxy); `SESSION_SECURE_COOKIE=true`, `SESSION_DOMAIN=.example.eg`, `SANCTUM_STATEFUL_DOMAINS=app.example.eg`.
- `php artisan migrate --force` on deploy; `php artisan config:cache route:cache event:cache`.
- Supervisor/systemd: `php artisan queue:work --queue=urgent,default --tries=3` (≥2 workers) and `php artisan schedule:run` every minute.
- Storage: `storage/` writable by the PHP user; `storage/app/private` never web-served.
- Logging: `LOG_CHANNEL=daily` or stderr to your aggregator; monitor `failed_jobs`.
- Health checks: `GET /api/v1/health` (DB + Redis) and `GET /up`.
- Backups: nightly `pg_dump` (encrypted, off-site, retention policy), tested restores; Redis is cache/queue only.
- Configure SMTP; verify the emergency number; legal/compliance review (see `docs/security.md`).
