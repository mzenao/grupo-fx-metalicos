from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db


class Advance(db.Model):
	__tablename__ = "advances"
	__table_args__ = (
		CheckConstraint("value_total > 0", name="ck_advances_value_total_gt_zero"),
		CheckConstraint("value_remaining >= 0", name="ck_advances_value_remaining_gte_zero"),
		CheckConstraint("status IN ('pendente', 'finalizado')", name="ck_advances_status_valid"),
	)

	id: Mapped[int] = mapped_column(db.BigInteger, primary_key=True)
	supplier_id: Mapped[int] = mapped_column(
		db.BigInteger,
		ForeignKey("suppliers.id", ondelete="RESTRICT"),
		nullable=False,
	)
	employee_id: Mapped[int] = mapped_column(
		db.BigInteger,
		ForeignKey("employees.id", ondelete="RESTRICT"),
		nullable=False,
	)
	value_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
	value_remaining: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
	advance_datetime: Mapped[datetime] = mapped_column(DateTime, nullable=False)
	status: Mapped[str] = mapped_column(String(20), nullable=False, default="pendente")
	created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

	supplier = relationship("Supplier", back_populates="advances")
	employee = relationship("Employee", back_populates="advances")
	attachments = relationship(
		"AdvanceAttachment",
		back_populates="advance",
		cascade="all, delete-orphan",
	)
	purchases = relationship("Purchase", back_populates="advance")

	def to_dict(self) -> dict:
		return {
			"id": self.id,
			"supplier_id": self.supplier_id,
			"supplier_code": self.supplier.supplier_code if self.supplier else None,
			"employee_id": self.employee_id,
			"value_total": float(self.value_total),
			"value_remaining": float(self.value_remaining),
			"advance_datetime": self.advance_datetime.isoformat(),
			"status": self.status,
			"attachments": [attachment.to_dict() for attachment in self.attachments],
			"created_at": self.created_at.isoformat(),
		}
