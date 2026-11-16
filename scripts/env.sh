#!/usr/bin/env bash
# Source this file to put the project-local toolchain on PATH:  source scripts/env.sh
_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$_ROOT/.tools/php:$_ROOT/.tools/composer:$_ROOT/.tools/pgsql/bin:$_ROOT/.tools/redis:$PATH"
composer() { php "$_ROOT/.tools/composer/composer.phar" "$@"; }
