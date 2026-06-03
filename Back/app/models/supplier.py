from __future__ import annotations

import json
from datetime import datetime

from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
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
	vehicle_plates_extra: Mapped[str | None] = mapped_column(Text, nullable=True)
	advance_credit_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
	reference_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
	endereco_unificado: Mapped[str | None] = mapped_column(String(255), nullable=True)
	rua: Mapped[str | None] = mapped_column(String(120), nullable=True)
	numero: Mapped[str | None] = mapped_column(String(20), nullable=True)
	bairro: Mapped[str | None] = mapped_column(String(120), nullable=True)
	cidade: Mapped[str | None] = mapped_column(String(120), nullable=True)
	estado: Mapped[str | None] = mapped_column(String(2), nullable=True)
	pais: Mapped[str | None] = mapped_column(String(120), nullable=True)
	cep: Mapped[str | None] = mapped_column(String(9), nullable=True)
	phone: Mapped[str | None] = mapped_column(String(25), nullable=True)
	pix_key_type: Mapped[str] = mapped_column(String(10), nullable=False)
	pix_key_value: Mapped[str] = mapped_column(String(150), nullable=False)
	created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

	user = relationship("User", back_populates="supplier")
	purchases = relationship("Purchase", back_populates="supplier")
	advances = relationship("Advance", back_populates="supplier")

	def to_dict(self) -> dict:
		vehicle_plate = (self.vehicle_plate or "").strip().replace(" ", "").upper() or None
		plates_extra: list[str] = []
		raw_extra = (self.vehicle_plates_extra or "").strip()
		if raw_extra.startswith("["):
			try:
				decoded = json.loads(raw_extra)
				if isinstance(decoded, list):
					plates_extra = [str(plate).strip().upper() for plate in decoded if str(plate).strip()]
			except (TypeError, ValueError, json.JSONDecodeError):
				plates_extra = []

		return {
			"id": self.id,
			"user_id": self.user_id,
			"supplier_code": self.supplier_code,
			"is_pf": self.is_pf,
			"name": self.name,
			"company_name": self.company_name,
			"cpf": self.cpf,
			"cnpj": self.cnpj,
			"vehicle_plate": vehicle_plate,
			"vehicle_plates_extra": plates_extra,
			"advance_credit_balance": float(self.advance_credit_balance or 0),
			"reference_address": self.reference_address or self.endereco_unificado,
			"endereco_unificado": self.endereco_unificado or self.reference_address,
			"rua": self.rua,
			"numero": self.numero,
			"bairro": self.bairro,
			"cidade": self.cidade,
			"estado": self.estado,
			"pais": self.pais,
			"cep": self.cep,
			"phone": self.phone,
			"pix_key_type": self.pix_key_type,
			"pix_key_value": self.pix_key_value,
			"created_at": self.created_at.isoformat(),
			"email": self.user.email if self.user else None,
		}

