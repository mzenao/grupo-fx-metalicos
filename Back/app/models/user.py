from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db


class User(db.Model):
	__tablename__ = "users"

	id: Mapped[int] = mapped_column(db.BigInteger, primary_key=True)
	email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
	password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
	role: Mapped[str] = mapped_column(String(20), nullable=False)
	is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
	created_at: Mapped[datetime] = mapped_column(
		DateTime,
		nullable=False,
		default=datetime.utcnow,
	)

	employee = relationship(
		"Employee",
		back_populates="user",
		uselist=False,
		cascade="all, delete-orphan",
	)
	supplier = relationship(
		"Supplier",
		back_populates="user",
		uselist=False,
		cascade="all, delete-orphan",
	)
	auth_tokens = relationship(
		"AuthToken",
		back_populates="user",
		cascade="all, delete-orphan",
		lazy="dynamic",
	)

	def to_dict(self) -> dict:
		return {
			"id": self.id,
			"email": self.email,
			"role": self.role,
			"is_active": self.is_active,
			"created_at": self.created_at.isoformat(),
		}

