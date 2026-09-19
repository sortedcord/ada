#!/usr/bin/env sh
set -eu

: "${DATABASE_URL:?DATABASE_URL must be set}"
if [ "${NODE_ENV:-development}" = production ] && [ "${ALLOW_MIGRATIONS:-false}" != true ]; then
  echo 'Refusing production migration without ALLOW_MIGRATIONS=true.' >&2
  exit 1
fi
pnpm exec drizzle-kit migrate --config drizzle.config.ts
