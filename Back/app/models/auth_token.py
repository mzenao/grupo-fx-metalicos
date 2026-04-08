from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db


class AuthToken(db.Model):
	__tablename__ = "auth_tokens"

	id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	user_id: Mapped[int] = mapped_column(
		db.BigInteger,
		ForeignKey("users.id", ondelete="CASCADE"),
		nullable=False,
		index=True,
	)
	token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
	expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
	revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
	created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

	user = relationship("User", back_populates="auth_tokens")

	def is_expired(self) -> bool:
		return datetime.utcnow() >= self.expires_at

