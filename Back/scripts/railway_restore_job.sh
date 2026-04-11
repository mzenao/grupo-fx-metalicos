#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACK_DIR=$(cd "$SCRIPT_DIR/.." && pwd)

cd "$BACK_DIR"

if [ "${RESTORE_CONFIRM:-false}" != "true" ]; then
	echo "[restore] RESTORE_CONFIRM=true is required to run this job"
	exit 1
fi

if command -v python3 >/dev/null 2>&1; then
	PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
	PYTHON_BIN="python"
else
	echo "python/python3 não encontrado no PATH"
	exit 1
fi

ARGS=()
if [ -n "${RESTORE_BACKUP_KEY:-}" ]; then
	ARGS+=(--key "$RESTORE_BACKUP_KEY")
fi

if [ "${RESTORE_DOWNLOAD_ONLY:-false}" = "true" ]; then
	ARGS+=(--download-only)
fi

echo "[restore] Starting restore job"
exec "$PYTHON_BIN" scripts/restore_latest_backup_s3.py "${ARGS[@]}"
