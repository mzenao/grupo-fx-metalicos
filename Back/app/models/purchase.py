from __future__ import annotations

import json
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db
from app.utils.datetime_utils import format_brasilia_datetime


class Purchase(db.Model):
	__tablename__ = "purchases"
	__table_args__ = (
		CheckConstraint("weight > 0", name="ck_purchases_weight_gt_zero"),
		CheckConstraint("value >= 0", name="ck_purchases_value_gte_zero"),
		CheckConstraint("value_per_kg >= 0", name="ck_purchases_value_per_kg_gte_zero"),
		CheckConstraint("impurity_percentage >= 0 AND impurity_percentage <= 100", name="ck_purchases_impurity_percentage_range"),
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
	material_type_id: Mapped[int] = mapped_column(
		db.BigInteger,
		ForeignKey("material_types.id", ondelete="RESTRICT"),
		nullable=False,
	)
	material_types_extra: Mapped[str | None] = mapped_column(Text, nullable=True)
	advance_id: Mapped[int | None] = mapped_column(
		db.BigInteger,
		ForeignKey("advances.id", ondelete="RESTRICT"),
		nullable=True,
	)
	weight: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
	value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
	value_per_kg: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
	impurity_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=0)
	advance_abatement_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
	advance_applied_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
	advance_remaining_after: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
	advance_credit_after: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
	purchase_datetime: Mapped[datetime] = mapped_column(DateTime, nullable=False)
	created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

	supplier = relationship("Supplier", back_populates="purchases")
	employee = relationship("Employee", back_populates="purchases")
	material_type = relationship("MaterialType", back_populates="purchases")
	advance = relationship("Advance", back_populates="purchases")
	attachments = relationship(
		"PurchaseAttachment",
		back_populates="purchase",
		cascade="all, delete-orphan",
	)

	def to_dict(self) -> dict:
		extra_materials: list[str] = []
		raw_extra = (self.material_types_extra or "").strip()
		if raw_extra.startswith("["):
			try:
				decoded = json.loads(raw_extra)
				if isinstance(decoded, list):
					extra_materials = [str(item).strip() for item in decoded if str(item).strip()]
			except (TypeError, ValueError, json.JSONDecodeError):
				extra_materials = []

		return {
			"id": self.id,
			"supplier_id": self.supplier_id,
			"supplier_code": self.supplier.supplier_code if self.supplier else None,
			"employee_id": self.employee_id,
			"material_type_id": self.material_type_id,
			"material_types_extra": extra_materials,
			"advance_id": self.advance_id,
			"weight": float(self.weight),
			"value": float(self.value),
			"value_per_kg": float(self.value_per_kg),
			"impurity_percentage": float(self.impurity_percentage or 0),
			"advance_abatement_value": float(self.advance_abatement_value or 0),
			"advance_applied_value": float(self.advance_applied_value or 0),
			"advance_remaining_after": float(self.advance_remaining_after or 0),
			"advance_credit_after": float(self.advance_credit_after or 0),
			"purchase_datetime": format_brasilia_datetime(self.purchase_datetime),
			"attachments": [attachment.to_dict() for attachment in self.attachments],
			"created_at": self.created_at.isoformat(),
		}
