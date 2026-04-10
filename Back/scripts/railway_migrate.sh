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

"$PYTHON_BIN" -m flask --app wsgi db upgrade

"$PYTHON_BIN" "$SCRIPT_DIR/sync_sequences.py"
