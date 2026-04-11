"""add advances"""

from alembic import op
import sqlalchemy as sa


revision = "b7c8d9e0f1a2"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
	op.create_table(
		"advances",
		sa.Column("id", sa.BigInteger(), nullable=False),
		sa.Column("supplier_id", sa.BigInteger(), nullable=False),
		sa.Column("employee_id", sa.BigInteger(), nullable=False),
		sa.Column("value_total", sa.Numeric(12, 2), nullable=False),
		sa.Column("value_remaining", sa.Numeric(12, 2), nullable=False),
		sa.Column("advance_datetime", sa.DateTime(), nullable=False),
		sa.Column("status", sa.String(length=20), nullable=False),
		sa.Column("created_at", sa.DateTime(), nullable=False),
		sa.CheckConstraint("value_total > 0", name="ck_advances_value_total_gt_zero"),
		sa.CheckConstraint("value_remaining >= 0", name="ck_advances_value_remaining_gte_zero"),
		sa.CheckConstraint("status IN ('pendente', 'finalizado')", name="ck_advances_status_valid"),
		sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"], ondelete="RESTRICT"),
		sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="RESTRICT"),
		sa.PrimaryKeyConstraint("id"),
	)

	op.create_table(
		"advance_attachments",
		sa.Column("id", sa.BigInteger(), nullable=False),
		sa.Column("advance_id", sa.BigInteger(), nullable=False),
		sa.Column("file_name", sa.String(length=255), nullable=False),
		sa.Column("file_path", sa.String(length=500), nullable=True),
		sa.Column("file_type", sa.String(length=50), nullable=True),
		sa.Column("created_at", sa.DateTime(), nullable=False),
		sa.ForeignKeyConstraint(["advance_id"], ["advances.id"], ondelete="CASCADE"),
		sa.PrimaryKeyConstraint("id"),
	)

	op.add_column(
		"purchases",
		sa.Column("advance_id", sa.BigInteger(), nullable=True),
	)
	op.add_column(
		"purchases",
		sa.Column("advance_abatement_value", sa.Numeric(12, 2), nullable=False, server_default=sa.text("0")),
	)
	op.add_column(
		"purchases",
		sa.Column("advance_remaining_after", sa.Numeric(12, 2), nullable=False, server_default=sa.text("0")),
	)
	op.create_foreign_key(
		"fk_purchases_advance_id_advances",
		"purchases",
		"advances",
		["advance_id"],
		["id"],
		ondelete="RESTRICT",
	)


def downgrade() -> None:
	op.drop_constraint("fk_purchases_advance_id_advances", "purchases", type_="foreignkey")
	op.drop_column("purchases", "advance_remaining_after")
	op.drop_column("purchases", "advance_abatement_value")
	op.drop_column("purchases", "advance_id")
	op.drop_table("advance_attachments")
	op.drop_table("advances")
