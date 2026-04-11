from __future__ import annotations

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models.advance import Advance
from app.models.advance_attachment import AdvanceAttachment
from app.services.storage_service import save_attachment_file
from app.utils.file_utils import is_allowed_extension


def get_attachment(attachment_id: int) -> AdvanceAttachment:
	attachment = AdvanceAttachment.query.get(attachment_id)
	if not attachment:
		raise ValueError("Attachment not found")
	return attachment


def upload_attachment(
	*,
	advance_id: int,
	file: FileStorage,
	attachment_type: str | None = None,
) -> AdvanceAttachment:
	if not Advance.query.get(advance_id):
		raise ValueError("Advance not found")

	if not file or not file.filename:
		raise ValueError("File is required")

	if not is_allowed_extension(file.filename):
		raise ValueError("File extension not allowed")

	try:
		_, file_path = save_attachment_file(file)
	except OSError as exc:
		raise ValueError(f"Unable to save attachment file: {exc}")

	attachment = AdvanceAttachment(
		advance_id=advance_id,
		file_name=secure_filename(file.filename or "attachment"),
		file_path=file_path,
		file_type=file.mimetype,
	)

	try:
		db.session.add(attachment)
		db.session.commit()
	except Exception:
		db.session.rollback()
		raise
	return attachment


def delete_attachment(attachment_id: int) -> None:
	attachment = get_attachment(attachment_id)
	db.session.delete(attachment)
	db.session.commit()
