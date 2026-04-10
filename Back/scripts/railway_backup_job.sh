#!/usr/bin/env bash
set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACK_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
LOG_FILE="$BACK_DIR/logs/backup_job.log"

mkdir -p "$(dirname "$LOG_FILE")"

# Trap de erro com logging
trap 'echo "[ERROR] Backup job failed at line $LINENO" | tee -a "$LOG_FILE"; exit 1' ERR

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup job" | tee -a "$LOG_FILE"

cd "$BACK_DIR"
bash scripts/backup_and_upload.sh 2>&1 | tee -a "$LOG_FILE"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup job completed successfully" | tee -a "$LOG_FILE"
