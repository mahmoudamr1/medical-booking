#!/usr/bin/env bash
# One-terminal development runner:
#   PostgreSQL + Redis, Laravel API (:8000), queue worker, scheduler, Next.js (:3000)
# Usage (Git Bash, repo root):  bash scripts/dev.sh        Ctrl+C stops everything.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT/scripts/env.sh"

bash "$ROOT/scripts/dev-services.sh" start

# First-run setup (idempotent).
if [ ! -f "$ROOT/backend/vendor/autoload.php" ]; then (cd "$ROOT/backend" && composer install --no-interaction); fi
if [ ! -f "$ROOT/backend/.env" ]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  (cd "$ROOT/backend" && php artisan key:generate -q)
fi
(cd "$ROOT/backend" && php artisan migrate --force -q)
if [ "$(cd "$ROOT/backend" && php artisan tinker --execute='echo \App\Models\Specialty::count();' 2>/dev/null | tail -1)" = "0" ]; then
  (cd "$ROOT/backend" && php artisan db:seed --force -q)
fi
if [ ! -d "$ROOT/frontend/node_modules" ]; then (cd "$ROOT/frontend" && npm install); fi

PIDS=()
run() { # name color dir command...
  local name=$1 color=$2 dir=$3; shift 3
  ( cd "$dir" && "$@" 2>&1 | sed -u "s/^/$(printf '\033[%sm[%s]\033[0m ' "$color" "$name")/" ) &
  PIDS+=($!)
}

cleanup() {
  echo; echo "Stopping..."
  for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null; done
  # Windows: make sure the PHP / Node children are gone too.
  taskkill //F //IM php.exe >/dev/null 2>&1
  for p in $(netstat -ano | grep -E ':3000 .*LISTENING' | awk '{print $5}' | sort -u); do taskkill //F //PID "$p" >/dev/null 2>&1; done
  bash "$ROOT/scripts/dev-services.sh" stop
  exit 0
}
trap cleanup INT TERM

run api   32 "$ROOT/backend"  env PHP_CLI_SERVER_WORKERS=4 php artisan serve --port=8000
run queue 33 "$ROOT/backend"  php artisan queue:work --queue=urgent,default --tries=3 --sleep=1
run sched 35 "$ROOT/backend"  php artisan schedule:work
run web   36 "$ROOT/frontend" npm run dev

for _ in $(seq 1 90); do
  curl -s -o /dev/null -m 2 http://localhost:3000 && curl -s -o /dev/null -m 2 http://localhost:8000/api/v1/health && break
  sleep 2
done
cat <<EOF

  ┌───────────────────────────────────────────────────────────┐
  │  App:      http://localhost:3000                            │
  │  API:      http://localhost:8000/api/v1/health              │
  │  Login:    admin@example.test   / Demo-GGH0Z6zRKs!          │
  │            patient@example.test / Demo-AxXlsaoJM4!          │
  │            dr.karim@example.test / Demo-PUoLRPjAHp!         │
  │  All demo accounts: docs/DEMO-ACCOUNTS.md                   │
  │  Ctrl+C stops everything                                    │
  └───────────────────────────────────────────────────────────┘

EOF
wait
