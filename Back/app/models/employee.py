from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db


class Employee(db.Model):
	__tablename__ = "employees"

	id: Mapped[int] = mapped_column(db.BigInteger, primary_key=True)
	user_id: Mapped[int] = mapped_column(
		db.BigInteger,
		ForeignKey("users.id", ondelete="CASCADE"),
		nullable=False,
		unique=True,
	)
	name: Mapped[str] = mapped_column(String(120), nullable=False)
	phone: Mapped[str | None] = mapped_column(String(25), nullable=True)
	occupation: Mapped[str | None] = mapped_column(String(80), nullable=True)
	created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

	user = relationship("User", back_populates="employee")
	purchases = relationship("Purchase", back_populates="employee")
	advances = relationship("Advance", back_populates="employee")

	def to_dict(self) -> dict:
		return {
			"id": self.id,
			"user_id": self.user_id,
			"name": self.name,
			"phone": self.phone,
			"occupation": self.occupation,
			"created_at": self.created_at.isoformat(),
			"email": self.user.email if self.user else None,
		}

