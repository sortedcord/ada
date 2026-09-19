#!/usr/bin/env sh
set -eu
case "${NODE_ENV:-development}" in
  development|test) ;;
  *) echo 'Refusing seed outside development/test.' >&2; exit 1 ;;
esac
: "${DATABASE_URL:?DATABASE_URL must be set}"
command -v psql >/dev/null 2>&1 || { echo 'psql is required for database seed checks.' >&2; exit 1; }
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c 'select 1' >/dev/null
echo 'Database connectivity verified; application seed fixtures are added with the domain schema.'
