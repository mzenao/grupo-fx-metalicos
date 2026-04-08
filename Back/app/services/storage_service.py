from __future__ import annotations

import uuid
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from flask import current_app
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from app.utils.file_utils import save_upload_file


def _normalize_storage_backend() -> str:
    backend = (current_app.config.get("STORAGE_BACKEND") or "local").strip().lower()
    return backend or "local"


def _build_s3_public_url(bucket: str, region: str, key: str) -> str:
    custom_base = (current_app.config.get("AWS_S3_PUBLIC_BASE_URL") or "").strip().rstrip("/")
    if custom_base:
        return f"{custom_base}/{key}"
    region_suffix = f".{region}" if region else ""
    return f"https://{bucket}.s3{region_suffix}.amazonaws.com/{key}"


def _save_to_s3(file: FileStorage) -> tuple[str, str]:
    bucket = (current_app.config.get("AWS_S3_BUCKET") or "").strip()
    region = (current_app.config.get("AWS_REGION") or "").strip()
    access_key = (current_app.config.get("AWS_ACCESS_KEY_ID") or "").strip()
    secret_key = (current_app.config.get("AWS_SECRET_ACCESS_KEY") or "").strip()

    if not bucket or not access_key or not secret_key:
        raise ValueError("S3 backend selected but AWS credentials/bucket are missing")

    safe_name = secure_filename(file.filename or "attachment")
    ext = Path(safe_name).suffix.lower()
    date_prefix = datetime.utcnow().strftime("%Y/%m")
    base_prefix = (current_app.config.get("AWS_S3_PREFIX") or "attachments").strip("/")
    key = f"{base_prefix}/{date_prefix}/{uuid.uuid4().hex}{ext}"

    s3 = boto3.client(
        "s3",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region or None,
    )

    try:
        file.stream.seek(0)
        s3.upload_fileobj(
            Fileobj=file.stream,
            Bucket=bucket,
            Key=key,
            ExtraArgs={"ContentType": file.mimetype or "application/octet-stream"},
        )
    except (BotoCoreError, ClientError) as exc:
        raise ValueError(f"Unable to upload attachment to S3: {exc}")

    # Persist S3 key in database; signed URLs are generated on demand.
    return key, key


def save_attachment_file(file: FileStorage) -> tuple[str, str]:
    backend = _normalize_storage_backend()
    if backend == "s3":
        return _save_to_s3(file)

    _, file_path = save_upload_file(file, current_app.config["UPLOAD_FOLDER"])
    return file_path, file_path


def resolve_attachment_source(file_path: str | None) -> str | None:
    if not file_path:
        return None

    backend = _normalize_storage_backend()
    if backend != "s3":
        return file_path

    bucket = (current_app.config.get("AWS_S3_BUCKET") or "").strip()
    region = (current_app.config.get("AWS_REGION") or "").strip()
    access_key = (current_app.config.get("AWS_ACCESS_KEY_ID") or "").strip()
    secret_key = (current_app.config.get("AWS_SECRET_ACCESS_KEY") or "").strip()
    expires_in = int(current_app.config.get("AWS_S3_PRESIGNED_EXPIRES", 3600))

    if not bucket or not access_key or not secret_key:
        raise ValueError("S3 backend selected but AWS credentials/bucket are missing")

    key = file_path
    if file_path.startswith(("http://", "https://")):
        parsed = urlparse(file_path)
        host = (parsed.netloc or "").lower()
        path_key = parsed.path.lstrip("/")
        if host.endswith("amazonaws.com") and path_key:
            if path_key.startswith(f"{bucket}/"):
                key = path_key[len(bucket) + 1 :]
            else:
                key = path_key
        else:
            return file_path

    s3 = boto3.client(
        "s3",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region or None,
    )

    return _generate_presigned_url(s3, bucket, key, expires_in=expires_in)

def _generate_presigned_url(s3, bucket: str, key: str, expires_in=600) -> str:
    try:
        url = s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": bucket,
                "Key": key
            },
            ExpiresIn=expires_in
        )
        return url
    except Exception as exc:
        raise ValueError(f"Erro ao gerar URL temporária: {exc}")