from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db


class SystemNotification(db.Model):
	__tablename__ = "system_notifications"

	id: Mapped[int] = mapped_column(db.BigInteger, primary_key=True)
	event_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
	title: Mapped[str] = mapped_column(String(150), nullable=False)
	message: Mapped[str] = mapped_column(Text, nullable=False)
	entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
	entity_id: Mapped[int | None] = mapped_column(db.BigInteger, nullable=True)
	actor_user_id: Mapped[int | None] = mapped_column(
		db.BigInteger,
		ForeignKey("users.id", ondelete="SET NULL"),
		nullable=True,
	)
	details: Mapped[dict] = mapped_column(db.JSON, nullable=False, default=dict)
	created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

	actor_user = relationship("User")

	def to_dict(self) -> dict:
		actor = self.actor_user.to_dict() if self.actor_user else None
		return {
			"id": self.id,
			"event_type": self.event_type,
			"title": self.title,
			"message": self.message,
			"entity_type": self.entity_type,
			"entity_id": self.entity_id,
			"actor_user": actor,
			"details": self.details or {},
			"created_at": self.created_at.isoformat(),
		}