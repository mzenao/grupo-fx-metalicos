#!/usr/bin/env bash
set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACK_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
LOG_DIR="$BACK_DIR/logs"
CRON_EXPR="0 0 * * *"
CMD="cd $BACK_DIR && /usr/bin/env bash scripts/backup_and_upload.sh >> $LOG_DIR/backup_cron.log 2>&1"
CRON_LINE="$CRON_EXPR $CMD"

mkdir -p "$LOG_DIR"

CURRENT_CRON=$(crontab -l 2>/dev/null || true)
if echo "$CURRENT_CRON" | grep -F "$CMD" >/dev/null; then
	echo "Cron de backup já está configurado"
	exit 0
fi

printf "%s\n%s\n" "$CURRENT_CRON" "$CRON_LINE" | crontab -
echo "Cron configurado: $CRON_LINE"