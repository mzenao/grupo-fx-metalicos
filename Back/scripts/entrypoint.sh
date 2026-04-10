#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACK_DIR=$(cd "$SCRIPT_DIR/.." && pwd)

cd "$BACK_DIR"

echo "[entrypoint] cwd=$PWD"
echo "[entrypoint] args: $*"

if [ $# -gt 0 ] && [ "$1" = "backup" ]; then
	exec bash scripts/railway_backup_job.sh
fi

if [ $# -gt 0 ] && [ "$1" = "web" ]; then
	exec bash scripts/start_with_migrate.sh
fi

exec bash scripts/start_with_migrate.sh
