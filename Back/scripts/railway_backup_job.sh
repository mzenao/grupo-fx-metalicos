#!/usr/bin/env bash
set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACK_DIR=$(cd "$SCRIPT_DIR/.." && pwd)

cd "$BACK_DIR"
/usr/bin/env bash scripts/backup_and_upload.sh
