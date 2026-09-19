#!/usr/bin/env sh
set -eu

: "${DATABASE_URL:?DATABASE_URL must be set}"
out_dir="${BACKUP_DIR:-backups}"
mkdir -p "$out_dir"
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
file="$out_dir/ai-dungeon-$timestamp.sql.gz"
pg_dump "$DATABASE_URL" | gzip -9 > "$file"
sha256sum "$file" > "$file.sha256"
printf 'Created %s\n' "$file"
