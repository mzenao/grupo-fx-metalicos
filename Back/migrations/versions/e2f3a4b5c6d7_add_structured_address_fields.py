"""add structured address fields

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-04-16 00:00:00.000000
"""

from __future__ import annotations

import re

from alembic import op
import sqlalchemy as sa


revision = "e2f3a4b5c6d7"
down_revision = "d1e2f3a4b5c6"
branch_labels = None
depends_on = None


def _parse_reference_address(value: str | None) -> dict[str, str | None]:
	if not value:
		return {
			"rua": None,
			"numero": None,
			"bairro": None,
			"cidade": None,
			"estado": None,
			"pais": None,
			"cep": None,
		}

	pattern = re.compile(
		r"^(?P<rua>[^,]+),\s*(?P<numero>[^-]+)\s*-\s*(?P<bairro>[^-]+)\s*-\s*(?P<cidade>[^-]+)\s*-\s*(?P<estado>[A-Za-z]{2})\s*-\s*(?P<pais>[^-]+)\s*-\s*(?P<cep>\d{5}-?\d{3})$"
	)
	match = pattern.match(value.strip())
	if not match:
		return {
			"rua": None,
			"numero": None,
			"bairro": None,
			"cidade": None,
			"estado": None,
			"pais": None,
			"cep": None,
		}

	parts = match.groupdict()
	cep_digits = re.sub(r"\D", "", parts.get("cep") or "")
	cep = f"{cep_digits[:5]}-{cep_digits[5:]}" if len(cep_digits) == 8 else None
	return {
		"rua": (parts.get("rua") or "").strip() or None,
		"numero": (parts.get("numero") or "").strip() or None,
		"bairro": (parts.get("bairro") or "").strip() or None,
		"cidade": (parts.get("cidade") or "").strip() or None,
		"estado": (parts.get("estado") or "").strip().upper() or None,
		"pais": (parts.get("pais") or "").strip() or None,
		"cep": cep,
	}


def upgrade() -> None:
	op.add_column("users", sa.Column("reference_address", sa.String(length=255), nullable=True))
	op.add_column("users", sa.Column("endereco_unificado", sa.String(length=255), nullable=True))
	op.add_column("users", sa.Column("rua", sa.String(length=120), nullable=True))
	op.add_column("users", sa.Column("numero", sa.String(length=20), nullable=True))
	op.add_column("users", sa.Column("bairro", sa.String(length=120), nullable=True))
	op.add_column("users", sa.Column("cidade", sa.String(length=120), nullable=True))
	op.add_column("users", sa.Column("estado", sa.String(length=2), nullable=True))
	op.add_column("users", sa.Column("pais", sa.String(length=120), nullable=True))
	op.add_column("users", sa.Column("cep", sa.String(length=9), nullable=True))

	op.add_column("suppliers", sa.Column("rua", sa.String(length=120), nullable=True))
	op.add_column("suppliers", sa.Column("endereco_unificado", sa.String(length=255), nullable=True))
	op.add_column("suppliers", sa.Column("numero", sa.String(length=20), nullable=True))
	op.add_column("suppliers", sa.Column("bairro", sa.String(length=120), nullable=True))
	op.add_column("suppliers", sa.Column("cidade", sa.String(length=120), nullable=True))
	op.add_column("suppliers", sa.Column("estado", sa.String(length=2), nullable=True))
	op.add_column("suppliers", sa.Column("pais", sa.String(length=120), nullable=True))
	op.add_column("suppliers", sa.Column("cep", sa.String(length=9), nullable=True))

	bind = op.get_bind()
	rows = bind.execute(sa.text("SELECT id, reference_address FROM suppliers")).fetchall()
	for row in rows:
		bind.execute(
			sa.text("UPDATE suppliers SET endereco_unificado = :reference_address WHERE id = :id"),
			{"id": row.id, "reference_address": row.reference_address},
		)
		parsed = _parse_reference_address(row.reference_address)
		if not any(parsed.values()):
			continue
		bind.execute(
			sa.text(
				"""
				UPDATE suppliers
				SET rua = :rua,
					numero = :numero,
					bairro = :bairro,
					cidade = :cidade,
					estado = :estado,
					pais = :pais,
					cep = :cep
				WHERE id = :id
				"""
			),
			{
				"id": row.id,
				**parsed,
			},
		)


def downgrade() -> None:
	op.drop_column("suppliers", "cep")
	op.drop_column("suppliers", "pais")
	op.drop_column("suppliers", "estado")
	op.drop_column("suppliers", "cidade")
	op.drop_column("suppliers", "bairro")
	op.drop_column("suppliers", "numero")
	op.drop_column("suppliers", "endereco_unificado")
	op.drop_column("suppliers", "rua")

	op.drop_column("users", "cep")
	op.drop_column("users", "pais")
	op.drop_column("users", "estado")
	op.drop_column("users", "cidade")
	op.drop_column("users", "bairro")
	op.drop_column("users", "numero")
	op.drop_column("users", "rua")
	op.drop_column("users", "endereco_unificado")
	op.drop_column("users", "reference_address")
