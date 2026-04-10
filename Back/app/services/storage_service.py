from __future__ import annotations

import uuid
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import boto3
from botocore.config import Config as BotoConfig
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
    bucket = _clean_aws_value(current_app.config.get("AWS_S3_BUCKET"))
    region = _clean_aws_value(current_app.config.get("AWS_REGION"))
    access_key = _clean_aws_value(current_app.config.get("AWS_ACCESS_KEY_ID"))
    secret_key = _clean_aws_value(current_app.config.get("AWS_SECRET_ACCESS_KEY"))

    if not bucket or not access_key or not secret_key:
        raise ValueError("S3 backend selected but AWS credentials/bucket are missing")

    safe_name = secure_filename(file.filename or "attachment")
    ext = Path(safe_name).suffix.lower()
    date_prefix = datetime.utcnow().strftime("%Y/%m")
    base_prefix = (current_app.config.get("AWS_S3_PREFIX") or "attachments").strip("/")
    key = f"{base_prefix}/{date_prefix}/{uuid.uuid4().hex}{ext}"

    s3 = _build_s3_client(region=region, access_key=access_key, secret_key=secret_key)

    try:
        file.stream.seek(0)
        s3.upload_fileobj(
            Fileobj=file.stream,
            Bucket=bucket,
            Key=key,
            ExtraArgs={"ContentType": file.mimetype or "application/octet-stream"},
        )
    except (BotoCoreError, ClientError) as exc:
        if isinstance(exc, ClientError):
            error = exc.response.get("Error", {})
            code = error.get("Code", "Unknown")
            message = error.get("Message", str(exc))
            if code == "SignatureDoesNotMatch":
                endpoint = _clean_aws_value(current_app.config.get("AWS_S3_ENDPOINT_URL")) or "aws-default"
                raise ValueError(
                    "S3 SignatureDoesNotMatch: confira AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, "
                    "AWS_SESSION_TOKEN (se temporário), AWS_REGION, AWS_S3_BUCKET, "
                    f"AWS_S3_ENDPOINT_URL ({endpoint}) e AWS_S3_ADDRESSING_STYLE."
                )
            raise ValueError(f"Unable to upload attachment to S3 ({code}): {message}")
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

    bucket = _clean_aws_value(current_app.config.get("AWS_S3_BUCKET"))
    region = _clean_aws_value(current_app.config.get("AWS_REGION"))
    access_key = _clean_aws_value(current_app.config.get("AWS_ACCESS_KEY_ID"))
    secret_key = _clean_aws_value(current_app.config.get("AWS_SECRET_ACCESS_KEY"))
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

    s3 = _build_s3_client(region=region, access_key=access_key, secret_key=secret_key)

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


def _clean_aws_value(value: str | None) -> str:
    if value is None:
        return ""
    cleaned = str(value).strip()
    if (cleaned.startswith('"') and cleaned.endswith('"')) or (cleaned.startswith("'") and cleaned.endswith("'")):
        cleaned = cleaned[1:-1].strip()
    return cleaned


def _build_s3_client(*, region: str, access_key: str, secret_key: str):
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