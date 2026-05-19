import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=True)


def normalize_zapi_base_url(value: str) -> str:
	clean_value = (value or "").strip().rstrip("/")
	if not clean_value:
		return ""

	parsed_url = urlparse(clean_value)
	if parsed_url.scheme and parsed_url.netloc:
		return f"{parsed_url.scheme}://{parsed_url.netloc}"

	return clean_value


class Config:
	SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
	DATABASE_URL = os.getenv("DATABASE_URL", "")
	SQLALCHEMY_DATABASE_URI = DATABASE_URL or os.getenv(
		"SQLALCHEMY_DATABASE_URI",
		"postgresql+psycopg2://postgres:postgres@localhost:5432/ferrovelho",
	)
	SQLALCHEMY_TRACK_MODIFICATIONS = False

	UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", str(BASE_DIR / "uploads"))
	APP_BASE_URL = os.getenv("APP_BASE_URL", "")
	STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local").strip().lower()
	MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 10 * 1024 * 1024))
	TOKEN_EXPIRES_HOURS = int(os.getenv("TOKEN_EXPIRES_HOURS", "12"))
	TOKEN_REMEMBER_EXPIRES_HOURS = int(os.getenv("TOKEN_REMEMBER_EXPIRES_HOURS", str(24 * 30)))

	ZAPI_BASE_URL = normalize_zapi_base_url(os.getenv("ZAPI_BASE_URL", ""))
	ZAPI_INSTANCE_ID = os.getenv("ZAPI_INSTANCE_ID", "")
	ZAPI_TOKEN = os.getenv("ZAPI_TOKEN", "")
	ZAPI_CLIENT_TOKEN = os.getenv("ZAPI_CLIENT_TOKEN", "")

	AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
	AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
	AWS_SESSION_TOKEN = os.getenv("AWS_SESSION_TOKEN", "")
	AWS_REGION = os.getenv("AWS_REGION", "")
	AWS_S3_ENDPOINT_URL = os.getenv("AWS_S3_ENDPOINT_URL", "")
	AWS_S3_ADDRESSING_STYLE = os.getenv("AWS_S3_ADDRESSING_STYLE", "virtual")
	AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET", "")
	AWS_S3_BACKUP_BUCKET = os.getenv("AWS_S3_BACKUP_BUCKET", "")
	AWS_S3_PREFIX = os.getenv("AWS_S3_PREFIX", "attachments")
	AWS_S3_PUBLIC_BASE_URL = os.getenv("AWS_S3_PUBLIC_BASE_URL", "")
	AWS_S3_PRESIGNED_EXPIRES = int(os.getenv("AWS_S3_PRESIGNED_EXPIRES", "3600"))
	RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
	RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "")
	RESEND_SUPPORT_FROM_EMAIL = os.getenv("RESEND_SUPPORT_FROM_EMAIL", "")

