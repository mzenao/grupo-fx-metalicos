#!/usr/bin/env bash
set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACK_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
ENV_FILE="$BACK_DIR/.env"

if [ -f "$ENV_FILE" ]; then
	set -a
	# shellcheck disable=SC1090
	source "$ENV_FILE"
	set +a
fi

# Prefer python3 on Linux containers (Railway), fallback to python.
if command -v python3 >/dev/null 2>&1; then
	PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
	PYTHON_BIN="python"
else
	echo "python/python3 não encontrado no PATH"
	exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="$BACK_DIR/backups/backup_${TIMESTAMP}.sql"

echo "[backup] Starting database dump"
"$SCRIPT_DIR/dump_postgres.sh" "$BACKUP_PATH"

echo "[backup] Uploading dump to S3 backup bucket"
cd "$BACK_DIR"
"$PYTHON_BIN" scripts/upload_backup_s3.py "$BACKUP_PATH"

# Default cleanup behavior:
# - On Railway: remove local dump by default (ephemeral disk).
# - Outside Railway: keep local dump by default.
if [ -n "${RAILWAY_ENVIRONMENT:-}" ]; then
	DEFAULT_CLEANUP="true"
else
	DEFAULT_CLEANUP="false"
fi

CLEANUP_LOCAL_BACKUP=${CLEANUP_LOCAL_BACKUP:-$DEFAULT_CLEANUP}
if [ "$CLEANUP_LOCAL_BACKUP" = "true" ]; then
	rm -f "$BACKUP_PATH"
	echo "[backup] Local dump removed after upload"
fi

echo "[backup] Finished successfully: $BACKUP_PATH"