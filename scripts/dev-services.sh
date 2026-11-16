#!/usr/bin/env bash
# Manage local PostgreSQL 18 + Redis from the portable toolchain (.tools/).
#   bash scripts/dev-services.sh start|stop|status
# First start initializes the cluster, creates role + databases (dev + test) and extensions.
# Development-only credentials; the server only listens on localhost.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT/scripts/env.sh"

PGDATA="$ROOT/.tools/pgdata"
PGPORT="${PGPORT:-5432}"
REDIS_PORT="${REDIS_PORT:-6379}"
DB_USER="${DB_USERNAME:-medical_user}"
DB_PASS="${DB_PASSWORD:-medical_dev_password}"
LOGDIR="$ROOT/.tools/logs"
mkdir -p "$LOGDIR"

pg_init() {
  [ -f "$PGDATA/PG_VERSION" ] && return 0
  echo "-> initializing PostgreSQL cluster"
  local pw; pw="$(mktemp)"; echo "postgres" > "$pw"
  initdb -D "$PGDATA" -U postgres --pwfile="$pw" -E UTF8 --locale=C \
    --auth-local=scram-sha-256 --auth-host=scram-sha-256 >/dev/null
  rm -f "$pw"
  {
    echo "listen_addresses = 'localhost'"
    echo "port = $PGPORT"
    echo "timezone = 'Africa/Cairo'"
  } >> "$PGDATA/postgresql.conf"
  PG_FRESH=1
}

pg_bootstrap() {
  export PGPASSWORD=postgres
  psql -h localhost -p "$PGPORT" -U postgres -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS' CREATEDB;
  END IF;
END \$\$;
SQL
  for db in medical_booking medical_booking_test; do
    if ! psql -h localhost -p "$PGPORT" -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1; then
      psql -h localhost -p "$PGPORT" -U postgres -q -c "CREATE DATABASE $db OWNER $DB_USER"
    fi
    # Extensions require superuser; create them once here so migrations can rely on them.
    psql -h localhost -p "$PGPORT" -U postgres -d "$db" -q \
      -c "CREATE EXTENSION IF NOT EXISTS btree_gist; CREATE EXTENSION IF NOT EXISTS pg_trgm;"
  done
  unset PGPASSWORD
}

start() {
  PG_FRESH=0
  pg_init
  if pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
    echo "postgres already running"
  else
    # Fully detach stdio so the daemon doesn't hold the caller's pipe open.
    pg_ctl -D "$PGDATA" -l "$LOGDIR/postgres.log" -w start </dev/null >/dev/null 2>&1
    echo "postgres started on :$PGPORT"
  fi
  pg_bootstrap

  if redis-cli -p "$REDIS_PORT" ping >/dev/null 2>&1; then
    echo "redis already running"
  else
    mkdir -p "$ROOT/.tools/redis-data"
    powershell.exe -NoProfile -Command "Start-Process -WindowStyle Hidden -FilePath '$(cygpath -w "$ROOT/.tools/redis/redis-server.exe")' -ArgumentList '--port $REDIS_PORT --bind 127.0.0.1 --dir \"$(cygpath -w "$ROOT/.tools/redis-data")\" --logfile \"$(cygpath -w "$LOGDIR/redis.log")\"'"
    for _ in $(seq 1 20); do redis-cli -p "$REDIS_PORT" ping >/dev/null 2>&1 && break; sleep 0.5; done
    redis-cli -p "$REDIS_PORT" ping >/dev/null && echo "redis started on :$REDIS_PORT"
  fi
}

stop() {
  pg_ctl -D "$PGDATA" -m fast stop >/dev/null 2>&1 && echo "postgres stopped" || echo "postgres not running"
  redis-cli -p "$REDIS_PORT" shutdown nosave >/dev/null 2>&1 && echo "redis stopped" || echo "redis not running"
}

status() {
  pg_ctl -D "$PGDATA" status >/dev/null 2>&1 && echo "postgres: running" || echo "postgres: stopped"
  redis-cli -p "$REDIS_PORT" ping >/dev/null 2>&1 && echo "redis: running" || echo "redis: stopped"
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  *) echo "usage: $0 start|stop|status"; exit 1 ;;
esac
