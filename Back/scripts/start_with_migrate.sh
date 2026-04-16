#!/usr/bin/env bash
set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACK_DIR=$(cd "$SCRIPT_DIR/.." && pwd)

cd "$BACK_DIR"

if command -v python3 >/dev/null 2>&1; then
	PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
	PYTHON_BIN="python"
else
	echo "python/python3 não encontrado no PATH"
	exit 1
fi

echo "[startup] Running database migrations"
"$PYTHON_BIN" -m flask --app wsgi db migrate -m "auto_startup_migration" || true
"$PYTHON_BIN" -m flask --app wsgi db upgrade

echo "[startup] Syncing primary key sequences"
"$PYTHON_BIN" "$SCRIPT_DIR/sync_sequences.py"

echo "[startup] Starting web server"
exec gunicorn wsgi:app --bind 0.0.0.0:${PORT:-5000}
