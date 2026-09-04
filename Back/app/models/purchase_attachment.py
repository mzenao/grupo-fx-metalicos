from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db
from app.services.storage_service import resolve_attachment_source


class PurchaseAttachment(db.Model):
	__tablename__ = "purchase_attachments"

	id: Mapped[int] = mapped_column(db.BigInteger, primary_key=True)
	purchase_id: Mapped[int] = mapped_column(
		db.BigInteger,
		ForeignKey("purchases.id", ondelete="CASCADE"),
		nullable=False,
	)
	file_name: Mapped[str] = mapped_column(String(255), nullable=False)
	file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
	file_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
	created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
	whatsapp_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
	email_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

	purchase = relationship("Purchase", back_populates="attachments")

	def _build_file_url(self) -> str | None:
		if not self.file_path:
			return None
		try:
			return resolve_attachment_source(self.file_path)
		except Exception:
			return self.file_path

	def to_dict(self) -> dict:
		return {
			"id": self.id,
			"purchase_id": self.purchase_id,
			"file_name": self.file_name,
			"file_path": self.file_path,
			"file_url": self._build_file_url(),
			"file_type": self.file_type,
			"created_at": self.created_at.isoformat(),
			"whatsapp_sent_at": self.whatsapp_sent_at.isoformat() if self.whatsapp_sent_at else None,
			"email_sent_at": self.email_sent_at.isoformat() if self.email_sent_at else None,
		}
