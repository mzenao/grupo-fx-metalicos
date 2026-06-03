"""add purchase balance and material details

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-06-02 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "f3a4b5c6d7e8"
down_revision = "e2f3a4b5c6d7"
branch_labels = None
depends_on = None


def upgrade() -> None:
	op.add_column(
		"suppliers",
		sa.Column("advance_credit_balance", sa.Numeric(12, 2), nullable=False, server_default=sa.text("0")),
	)
	op.add_column("purchases", sa.Column("material_types_extra", sa.Text(), nullable=True))
	op.add_column(
		"purchases",
		sa.Column("impurity_percentage", sa.Numeric(5, 2), nullable=False, server_default=sa.text("0")),
	)
	op.add_column(
		"purchases",
		sa.Column("advance_credit_after", sa.Numeric(12, 2), nullable=False, server_default=sa.text("0")),
	)
	op.create_check_constraint(
		"ck_purchases_impurity_percentage_range",
		"purchases",
		"impurity_percentage >= 0 AND impurity_percentage <= 100",
	)


def downgrade() -> None:
	op.drop_constraint("ck_purchases_impurity_percentage_range", "purchases", type_="check")
	op.drop_column("purchases", "advance_credit_after")
	op.drop_column("purchases", "impurity_percentage")
	op.drop_column("purchases", "material_types_extra")
	op.drop_column("suppliers", "advance_credit_balance")
