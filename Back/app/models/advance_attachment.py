from __future__ import annotations

from datetime import datetime

from flask import current_app
from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db


class AdvanceAttachment(db.Model):
	__tablename__ = "advance_attachments"

	id: Mapped[int] = mapped_column(db.BigInteger, primary_key=True)
	advance_id: Mapped[int] = mapped_column(
		db.BigInteger,
		ForeignKey("advances.id", ondelete="CASCADE"),
		nullable=False,
	)
	file_name: Mapped[str] = mapped_column(String(255), nullable=False)
	file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
	file_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
	created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

	advance = relationship("Advance", back_populates="attachments")

	def _build_file_url(self) -> str | None:
		if not self.file_path:
			return None
		if self.file_path.startswith("http://") or self.file_path.startswith("https://"):
			return self.file_path

		relative = f"/api/advance-attachments/{self.id}/file"
		base = (current_app.config.get("APP_BASE_URL") or "").strip().rstrip("/")
		return f"{base}{relative}" if base else relative

	def to_dict(self) -> dict:
		return {
			"id": self.id,
			"advance_id": self.advance_id,
			"file_name": self.file_name,
			"file_path": self.file_path,
			"file_url": self._build_file_url(),
			"file_type": self.file_type,
			"created_at": self.created_at.isoformat(),
		}
