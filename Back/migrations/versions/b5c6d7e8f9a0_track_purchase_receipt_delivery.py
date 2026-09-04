"""track purchase receipt delivery

Revision ID: b5c6d7e8f9a0
Revises: a4b5c6d7e8f9
Create Date: 2026-09-04 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "b5c6d7e8f9a0"
down_revision = "a4b5c6d7e8f9"
branch_labels = None
depends_on = None


def upgrade() -> None:
	op.add_column("purchases", sa.Column("receipts_notified_at", sa.DateTime(), nullable=True))
	op.add_column("purchase_attachments", sa.Column("whatsapp_sent_at", sa.DateTime(), nullable=True))
	op.add_column("purchase_attachments", sa.Column("email_sent_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
	op.drop_column("purchase_attachments", "email_sent_at")
	op.drop_column("purchase_attachments", "whatsapp_sent_at")
	op.drop_column("purchases", "receipts_notified_at")
