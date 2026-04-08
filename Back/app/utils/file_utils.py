from __future__ import annotations

import os
import uuid
from pathlib import Path

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename


ALLOWED_EXTENSIONS = {
	"pdf",
	"png",
	"jpg",
	"jpeg",
	"webp",
}


def is_allowed_extension(filename: str, allowed_extensions: set[str] | None = None) -> bool:
	allowed = allowed_extensions or ALLOWED_EXTENSIONS
	if "." not in filename:
		return False
	ext = filename.rsplit(".", 1)[1].lower()
	return ext in allowed


def save_upload_file(file: FileStorage, upload_folder: str) -> tuple[str, str]:
	safe_original_name = secure_filename(file.filename or "attachment")
	ext = os.path.splitext(safe_original_name)[1]
	unique_name = f"{uuid.uuid4().hex}{ext}"

	folder = Path(upload_folder)
	folder.mkdir(parents=True, exist_ok=True)

	file_path = folder / unique_name
	file.save(file_path)

	return safe_original_name, str(file_path)

