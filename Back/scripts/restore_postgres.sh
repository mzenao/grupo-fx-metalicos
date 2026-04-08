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

if [ -z "$1" ]; then
	echo "Usage: ./scripts/restore_postgres.sh <backup_file.sql>"
	exit 1
fi

RAW_DATABASE_URL=${DATABASE_URL:-${SQLALCHEMY_DATABASE_URI:-}}
if [ -z "$RAW_DATABASE_URL" ]; then
	echo "DATABASE_URL/SQLALCHEMY_DATABASE_URI não configurada no .env"
	exit 1
fi

# Normalize SQLAlchemy/Heroku/Railway URL formats for psql.
DATABASE_URL_PSQL=${RAW_DATABASE_URL/postgresql+psycopg2:/postgresql:}
DATABASE_URL_PSQL=${DATABASE_URL_PSQL/#postgres:\/\//postgresql://}

if ! command -v psql >/dev/null 2>&1; then
	echo "psql não encontrado no PATH. No Railway, instale postgresql-client no build image."
	exit 1
fi

psql "$DATABASE_URL_PSQL" -f "$1"
echo "Restore finished"

