from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
BACK_DIR = SCRIPT_DIR.parent
if str(BACK_DIR) not in sys.path:
	sys.path.insert(0, str(BACK_DIR))

from app import create_app
from app.services.backup_service import BackupService


def _clean_aws_value(value: str | None) -> str:
	if value is None:
		return ""
	cleaned = str(value).strip()
	if (cleaned.startswith('"') and cleaned.endswith('"')) or (cleaned.startswith("'") and cleaned.endswith("'")):
		cleaned = cleaned[1:-1].strip()
	return cleaned


def _normalize_database_url(raw_database_url: str) -> str:
	database_url = raw_database_url.strip()
	database_url = database_url.replace("postgresql+psycopg2://", "postgresql://", 1)
	database_url = database_url.replace("postgres://", "postgresql://", 1)
	return database_url


def _resolve_latest_key(backup_service: BackupService, prefix: str = "") -> str:
	response = backup_service.s3_client.list_objects_v2(Bucket=backup_service.bucket, Prefix=prefix)
	objects = response.get("Contents", [])
	backup_objects = [obj for obj in objects if obj.get("Key", "").endswith(".sql")]
	if not backup_objects:
		raise RuntimeError(f"No .sql backups found in bucket {backup_service.bucket}")

	latest_object = max(backup_objects, key=lambda obj: obj.get("LastModified"))
	return latest_object["Key"]


def run(backup_key: str | None, download_only: bool) -> None:
	app = create_app()
	with app.app_context():
		backup_service = BackupService()
		key = backup_key or _resolve_latest_key(backup_service)

		backup_dir = BACK_DIR / "backups"
		backup_dir.mkdir(parents=True, exist_ok=True)
		local_file = backup_dir / f"restore_{Path(key).name}"

		print(f"[restore_s3] Downloading s3://{backup_service.bucket}/{key}")
		backup_service.s3_client.download_file(backup_service.bucket, key, str(local_file))
		print(f"[restore_s3] Downloaded to {local_file}")

		if download_only:
			print("[restore_s3] Download completed with --download-only")
			return

		raw_database_url = _clean_aws_value(os.getenv("DATABASE_URL") or os.getenv("SQLALCHEMY_DATABASE_URI"))
		if not raw_database_url:
			raise RuntimeError("DATABASE_URL/SQLALCHEMY_DATABASE_URI is not configured")

		if not shutil_which("psql"):
			raise RuntimeError("psql not found in PATH")

		database_url = _normalize_database_url(raw_database_url)
		print(f"[restore_s3] Restoring to DATABASE_URL={database_url.split('@')[-1] if '@' in database_url else 'configured-target'}")

		command = ["psql", database_url, "-f", str(local_file)]
		result = subprocess.run(command, capture_output=True, text=True, check=False)
		if result.returncode != 0:
			print(result.stdout)
			print(result.stderr, file=sys.stderr)
			raise RuntimeError(f"Restore failed with exit code {result.returncode}")

		print("[restore_s3] Restore finished successfully")


def shutil_which(command: str) -> str | None:
	from shutil import which

	return which(command)


if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Download the latest S3 backup and restore it into PostgreSQL")
	parser.add_argument("--key", help="Specific S3 object key to restore. If omitted, the latest .sql backup is used.")
	parser.add_argument("--download-only", action="store_true", help="Only download the backup from S3 without restoring it")
	args = parser.parse_args()
	run(args.key, args.download_only)
