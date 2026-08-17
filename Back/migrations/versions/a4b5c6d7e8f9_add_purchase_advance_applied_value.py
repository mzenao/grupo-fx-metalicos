"""add purchase advance applied value

Revision ID: a4b5c6d7e8f9
Revises: f3a4b5c6d7e8
Create Date: 2026-08-17 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "a4b5c6d7e8f9"
down_revision = "f3a4b5c6d7e8"
branch_labels = None
depends_on = None


def upgrade() -> None:
	op.add_column(
		"purchases",
		sa.Column("advance_applied_value", sa.Numeric(12, 2), nullable=False, server_default=sa.text("0")),
	)
	op.execute(
		"UPDATE purchases SET advance_applied_value = advance_abatement_value "
		"WHERE advance_abatement_value > 0"
	)


def downgrade() -> None:
	op.drop_column("purchases", "advance_applied_value")
