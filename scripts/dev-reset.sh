#!/usr/bin/env sh
set -eu

case "${NODE_ENV:-development}" in
  development|test) ;;
  *) echo 'Refusing reset outside development/test (set NODE_ENV explicitly).' >&2; exit 1 ;;
esac

printf 'This deletes local Compose volumes. Type RESET to continue: '
read -r confirmation
[ "$confirmation" = RESET ] || { echo 'Reset cancelled.'; exit 0; }
docker compose down -v
