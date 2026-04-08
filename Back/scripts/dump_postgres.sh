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

RAW_DATABASE_URL=${DATABASE_URL:-${SQLALCHEMY_DATABASE_URI:-}}
if [ -z "$RAW_DATABASE_URL" ]; then
	echo "DATABASE_URL/SQLALCHEMY_DATABASE_URI não configurada no .env"
	exit 1
fi

# Normalize SQLAlchemy/Heroku/Railway URL formats for pg_dump.
DATABASE_URL_PGDUMP=${RAW_DATABASE_URL/postgresql+psycopg2:/postgresql:}
DATABASE_URL_PGDUMP=${DATABASE_URL_PGDUMP/#postgres:\/\//postgresql://}

if ! command -v pg_dump >/dev/null 2>&1; then
	echo "pg_dump não encontrado no PATH. No Railway, instale postgresql-client no build image."
	exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_PATH=${1:-"$BACK_DIR/backups/backup_${TIMESTAMP}.sql"}

mkdir -p "$(dirname "$OUTPUT_PATH")"
pg_dump "$DATABASE_URL_PGDUMP" -f "$OUTPUT_PATH"
echo "Backup generated at $OUTPUT_PATH"

