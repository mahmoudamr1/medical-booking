#!/usr/bin/env bash
# Downloads a portable, project-local toolchain into ./.tools (gitignored).
# Used on Windows dev machines without Docker. Idempotent: skips what already exists.
#   PHP 8.4 (NTS x64), Composer, PostgreSQL 18 binaries, Redis (Windows build)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/.tools"
DL="$TOOLS/_downloads"
mkdir -p "$DL"

PHP_ZIP="php-8.4.27-1-nts-Win32-vs17-x64.zip"
PG_ZIP="postgresql-18.4-1-windows-x64-binaries.zip"
REDIS_ZIP="Redis-8.10.3-Windows-x64-msys2.zip"

fetch() { # url dest
  if [ ! -s "$2" ]; then
    echo "-> downloading $(basename "$2")"
    curl -fL --retry 3 -A "Mozilla/5.0" -o "$2.part" "$1" && mv "$2.part" "$2"
  fi
}

unzip_to() { # zip dir
  if [ ! -d "$2" ]; then
    echo "-> extracting $(basename "$1")"
    mkdir -p "$2.tmp"
    powershell.exe -NoProfile -Command "Expand-Archive -LiteralPath '$(cygpath -w "$1")' -DestinationPath '$(cygpath -w "$2.tmp")' -Force"
    mv "$2.tmp" "$2"
  fi
}

# --- PHP ---
fetch "https://windows.php.net/downloads/releases/$PHP_ZIP" "$DL/$PHP_ZIP"
unzip_to "$DL/$PHP_ZIP" "$TOOLS/php"
if [ ! -f "$TOOLS/php/php.ini" ]; then
  cp "$TOOLS/php/php.ini-development" "$TOOLS/php/php.ini"
  EXT_DIR="$(cygpath -w "$TOOLS/php/ext")"
  {
    echo ""
    echo "; ---- project overrides ----"
    echo "extension_dir=\"$EXT_DIR\""
    for e in curl fileinfo mbstring openssl pdo_pgsql pgsql pdo_sqlite sqlite3 zip intl sodium gd sockets; do
      echo "extension=$e"
    done
    echo "memory_limit=1G"
    echo "date.timezone=Africa/Cairo"
    echo "upload_max_filesize=10M"
    echo "post_max_size=12M"
    echo "zend_extension=opcache"
    echo "opcache.enable=1"
    echo "opcache.enable_cli=1"
    echo "opcache.revalidate_freq=0"
    echo "realpath_cache_size=4096K"
  } >> "$TOOLS/php/php.ini"
fi

# --- Composer ---
mkdir -p "$TOOLS/composer"
fetch "https://getcomposer.org/download/latest-stable/composer.phar" "$TOOLS/composer/composer.phar"
# Windows shim so tools that shell out to `composer` (e.g. artisan install:*) find it on PATH
[ -f "$TOOLS/composer/composer.bat" ] || printf '@php "%%~dp0composer.phar" %%*\r\n' > "$TOOLS/composer/composer.bat"

# --- PostgreSQL 18 ---
fetch "https://get.enterprisedb.com/postgresql/$PG_ZIP" "$DL/$PG_ZIP"
unzip_to "$DL/$PG_ZIP" "$TOOLS/pgsql-extract"
[ -d "$TOOLS/pgsql" ] || mv "$TOOLS/pgsql-extract/pgsql" "$TOOLS/pgsql"

# --- Redis ---
fetch "https://github.com/redis-windows/redis-windows/releases/download/8.10.3/$REDIS_ZIP" "$DL/$REDIS_ZIP"
unzip_to "$DL/$REDIS_ZIP" "$TOOLS/redis-extract"
if [ ! -d "$TOOLS/redis" ]; then
  inner="$(find "$TOOLS/redis-extract" -name 'redis-server.exe' -printf '%h\n' | head -1)"
  mv "$inner" "$TOOLS/redis"
fi

echo "Toolchain ready in $TOOLS"
"$TOOLS/php/php.exe" -v | head -1
"$TOOLS/pgsql/bin/postgres.exe" --version
"$TOOLS/redis/redis-server.exe" --version
