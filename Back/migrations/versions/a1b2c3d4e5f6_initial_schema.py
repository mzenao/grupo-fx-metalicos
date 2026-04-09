"""initial schema

Revision ID: a1b2c3d4e5f6
Revises: 
Create Date: 2026-04-08 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "a1b2c3d4e5f6"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("email", sa.String(length=150), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "material_types",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("label", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("label"),
    )

    op.create_table(
        "employees",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=25), nullable=True),
        sa.Column("occupation", sa.String(length=80), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )

    op.create_table(
        "suppliers",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("supplier_code", sa.Integer(), nullable=False),
        sa.Column("is_pf", sa.Boolean(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("company_name", sa.String(length=150), nullable=True),
        sa.Column("cpf", sa.String(length=14), nullable=True),
        sa.Column("cnpj", sa.String(length=18), nullable=True),
        sa.Column("vehicle_plate", sa.String(length=10), nullable=True),
        sa.Column("reference_address", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=25), nullable=True),
        sa.Column("pix_key_type", sa.String(length=10), nullable=False),
        sa.Column("pix_key_value", sa.String(length=150), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "(is_pf = true AND cpf IS NOT NULL AND cnpj IS NULL) OR (is_pf = false AND cnpj IS NOT NULL AND cpf IS NULL)",
            name="ck_suppliers_pf_pj_document",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("supplier_code"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(
        "ix_suppliers_cpf_unique_not_null",
        "suppliers",
        ["cpf"],
        unique=True,
        postgresql_where=sa.text("cpf IS NOT NULL"),
    )
    op.create_index(
        "ix_suppliers_cnpj_unique_not_null",
        "suppliers",
        ["cnpj"],
        unique=True,
        postgresql_where=sa.text("cnpj IS NOT NULL"),
    )

    op.create_table(
        "purchases",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("supplier_id", sa.BigInteger(), nullable=False),
        sa.Column("employee_id", sa.BigInteger(), nullable=False),
        sa.Column("material_type_id", sa.BigInteger(), nullable=False),
        sa.Column("weight", sa.Numeric(10, 3), nullable=False),
        sa.Column("value", sa.Numeric(12, 2), nullable=False),
        sa.Column("value_per_kg", sa.Numeric(10, 2), nullable=False),
        sa.Column("purchase_datetime", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("weight > 0", name="ck_purchases_weight_gt_zero"),
        sa.CheckConstraint("value >= 0", name="ck_purchases_value_gte_zero"),
        sa.CheckConstraint("value_per_kg >= 0", name="ck_purchases_value_per_kg_gte_zero"),
        sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["material_type_id"], ["material_types.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "purchase_attachments",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("purchase_id", sa.BigInteger(), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=True),
        sa.Column("file_type", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["purchase_id"], ["purchases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "auth_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(op.f("ix_auth_tokens_user_id"), "auth_tokens", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_auth_tokens_user_id"), table_name="auth_tokens")
    op.drop_table("auth_tokens")
    op.drop_table("purchase_attachments")
    op.drop_table("purchases")
    op.drop_index("ix_suppliers_cnpj_unique_not_null", table_name="suppliers")
    op.drop_index("ix_suppliers_cpf_unique_not_null", table_name="suppliers")
    op.drop_table("suppliers")
    op.drop_table("employees")
    op.drop_table("material_types")
    op.drop_table("users")
