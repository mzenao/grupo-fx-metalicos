from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db


class Supplier(db.Model):
	__tablename__ = "suppliers"
	__table_args__ = (
		CheckConstraint(
			"(is_pf = true AND cpf IS NOT NULL AND cnpj IS NULL) OR "
			"(is_pf = false AND cnpj IS NOT NULL AND cpf IS NULL)",
			name="ck_suppliers_pf_pj_document",
		),
		Index(
			"ix_suppliers_cpf_unique_not_null",
			"cpf",
			unique=True,
			postgresql_where=(db.text("cpf IS NOT NULL")),
		),
		Index(
			"ix_suppliers_cnpj_unique_not_null",
			"cnpj",
			unique=True,
			postgresql_where=(db.text("cnpj IS NOT NULL")),
		),
	)

	id: Mapped[int] = mapped_column(db.BigInteger, primary_key=True)
	user_id: Mapped[int] = mapped_column(
		db.BigInteger,
		ForeignKey("users.id", ondelete="CASCADE"),
		nullable=False,
		unique=True,
	)
	supplier_code: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
	is_pf: Mapped[bool] = mapped_column(Boolean, nullable=False)
	name: Mapped[str] = mapped_column(String(120), nullable=False)
	company_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
	cpf: Mapped[str | None] = mapped_column(String(14), nullable=True)
	cnpj: Mapped[str | None] = mapped_column(String(18), nullable=True)
	vehicle_plate: Mapped[str | None] = mapped_column(String(10), nullable=True)
	reference_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
	phone: Mapped[str | None] = mapped_column(String(25), nullable=True)
	pix_key_type: Mapped[str] = mapped_column(String(10), nullable=False)
	pix_key_value: Mapped[str] = mapped_column(String(150), nullable=False)
	created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

	user = relationship("User", back_populates="supplier")
	purchases = relationship("Purchase", back_populates="supplier")

	def to_dict(self) -> dict:
		return {
			"id": self.id,
			"user_id": self.user_id,
			"supplier_code": self.supplier_code,
			"is_pf": self.is_pf,
			"name": self.name,
			"company_name": self.company_name,
			"cpf": self.cpf,
			"cnpj": self.cnpj,
			"vehicle_plate": self.vehicle_plate,
			"reference_address": self.reference_address,
			"phone": self.phone,
			"pix_key_type": self.pix_key_type,
			"pix_key_value": self.pix_key_value,
			"created_at": self.created_at.isoformat(),
			"email": self.user.email if self.user else None,
		}

