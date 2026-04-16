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
	reference_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
	endereco_unificado: Mapped[str | None] = mapped_column(String(255), nullable=True)
	rua: Mapped[str | None] = mapped_column(String(120), nullable=True)
	numero: Mapped[str | None] = mapped_column(String(20), nullable=True)
	bairro: Mapped[str | None] = mapped_column(String(120), nullable=True)
	cidade: Mapped[str | None] = mapped_column(String(120), nullable=True)
	estado: Mapped[str | None] = mapped_column(String(2), nullable=True)
	pais: Mapped[str | None] = mapped_column(String(120), nullable=True)
	cep: Mapped[str | None] = mapped_column(String(9), nullable=True)
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
			"reference_address": self.reference_address or self.endereco_unificado,
			"endereco_unificado": self.endereco_unificado or self.reference_address,
			"rua": self.rua,
			"numero": self.numero,
			"bairro": self.bairro,
			"cidade": self.cidade,
			"estado": self.estado,
			"pais": self.pais,
			"cep": self.cep,
			"role": self.role,
			"is_active": self.is_active,
			"created_at": self.created_at.isoformat(),
		}

