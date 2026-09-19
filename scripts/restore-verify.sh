#!/usr/bin/env sh
set -eu

: "${DATABASE_URL:?DATABASE_URL must be set}"
: "${BACKUP_FILE:?BACKUP_FILE must be set to a .sql.gz backup}"
gzip -t "$BACKUP_FILE"
sha256sum -c "$BACKUP_FILE.sha256"
printf 'Backup archive and checksum verified: %s\n' "$BACKUP_FILE"
# A future implementation restores into a disposable database/container; this wrapper deliberately never
# writes to the configured database so verification cannot destroy the active installation.
