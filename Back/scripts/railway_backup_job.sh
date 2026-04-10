#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACK_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
LOG_FILE="$BACK_DIR/logs/backup_job.log"

mkdir -p "$(dirname "$LOG_FILE")"

exec > >(tee -a "$LOG_FILE") 2>&1

trap 'echo "[ERROR] Backup job failed at line $LINENO"' ERR

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup job"

cd "$BACK_DIR"
bash scripts/backup_and_upload.sh

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup job completed successfully"
