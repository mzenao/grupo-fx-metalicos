from __future__ import annotations

import os
import subprocess
from datetime import datetime
from pathlib import Path

import boto3
from botocore.config import Config as BotoConfig
from flask import current_app


class BackupService:
	def __init__(self) -> None:
		self.bucket = _clean_aws_value(
			current_app.config.get("AWS_S3_BACKUP_BUCKET")
			or current_app.config.get("AWS_S3_BUCKET", "")
		)
		self.s3_client = _build_s3_client()

	def create_database_dump(self, output_dir: str) -> str:
		database_url = current_app.config.get("DATABASE_URL") or current_app.config.get("SQLALCHEMY_DATABASE_URI")
		if not database_url:
			raise ValueError("DATABASE_URL is not configured")

		output_path = Path(output_dir)
		output_path.mkdir(parents=True, exist_ok=True)
		file_name = f"backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.sql"
		dump_file = output_path / file_name

		env = os.environ.copy()
		env["DATABASE_URL"] = database_url

		command = ["pg_dump", database_url, "-f", str(dump_file)]
		result = subprocess.run(command, env=env, capture_output=True, text=True, check=False)
		if result.returncode != 0:
			raise RuntimeError(f"pg_dump failed: {result.stderr}")

		return str(dump_file)

	def upload_backup_to_s3(self, file_path: str, object_name: str | None = None) -> dict:
		if not self.bucket:
			raise ValueError("AWS_S3_BACKUP_BUCKET is not configured")

		s3_key = object_name or Path(file_path).name
		self.s3_client.upload_file(file_path, self.bucket, s3_key)
		return {"bucket": self.bucket, "key": s3_key}


def _clean_aws_value(value: str | None) -> str:
	if value is None:
		return ""
	cleaned = str(value).strip()
	if (cleaned.startswith('"') and cleaned.endswith('"')) or (cleaned.startswith("'") and cleaned.endswith("'")):
		cleaned = cleaned[1:-1].strip()
	return cleaned


def _build_s3_client():
	access_key = _clean_aws_value(current_app.config.get("AWS_ACCESS_KEY_ID"))
	secret_key = _clean_aws_value(current_app.config.get("AWS_SECRET_ACCESS_KEY"))
	region = _clean_aws_value(current_app.config.get("AWS_REGION"))
	session_token = _clean_aws_value(current_app.config.get("AWS_SESSION_TOKEN"))
	endpoint_url = _clean_aws_value(current_app.config.get("AWS_S3_ENDPOINT_URL"))
	addressing_style = _clean_aws_value(current_app.config.get("AWS_S3_ADDRESSING_STYLE")) or "virtual"

	client_kwargs = {
		"service_name": "s3",
		"aws_access_key_id": access_key,
		"aws_secret_access_key": secret_key,
		"region_name": region or None,
		"config": BotoConfig(signature_version="s3v4", s3={"addressing_style": addressing_style}),
	}
	if session_token:
		client_kwargs["aws_session_token"] = session_token
	if endpoint_url:
		client_kwargs["endpoint_url"] = endpoint_url

	return boto3.client(**client_kwargs)

