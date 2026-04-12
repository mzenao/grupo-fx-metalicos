"""add system notifications"""

from alembic import op
import sqlalchemy as sa


revision = "c9d0e1f2a3b4"
down_revision = "b7c8d9e0f1a2"
branch_labels = None
depends_on = None


def upgrade() -> None:
	op.create_table(
		"system_notifications",
		sa.Column("id", sa.BigInteger(), nullable=False),
		sa.Column("event_type", sa.String(length=60), nullable=False),
		sa.Column("title", sa.String(length=150), nullable=False),
		sa.Column("message", sa.Text(), nullable=False),
		sa.Column("entity_type", sa.String(length=50), nullable=True),
		sa.Column("entity_id", sa.BigInteger(), nullable=True),
		sa.Column("actor_user_id", sa.BigInteger(), nullable=True),
		sa.Column("details", sa.JSON(), nullable=False),
		sa.Column("created_at", sa.DateTime(), nullable=False),
		sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
		sa.PrimaryKeyConstraint("id"),
	)
	op.create_index(
		"ix_system_notifications_event_type",
		"system_notifications",
		["event_type"],
		unique=False,
	)
	op.create_index(
		"ix_system_notifications_created_at",
		"system_notifications",
		["created_at"],
		unique=False,
	)


def downgrade() -> None:
	op.drop_index("ix_system_notifications_created_at", table_name="system_notifications")
	op.drop_index("ix_system_notifications_event_type", table_name="system_notifications")
	op.drop_table("system_notifications")
