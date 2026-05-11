"""Garage seller fields: orders/inventory

Revision ID: 8c2a1b7f9e12
Revises: 6335c160b32b
Create Date: 2026-05-11 10:40:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "8c2a1b7f9e12"
down_revision = "6335c160b32b"
branch_labels = None
depends_on = None


def upgrade():
    # ✅ Order timestamps for seller prioritization
    with op.batch_alter_table("orders", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False)
        )

    # ✅ Inventory enhancements: profit + availability control
    with op.batch_alter_table("garage_parts", schema=None) as batch_op:
        batch_op.add_column(sa.Column("cost_price", sa.DECIMAL(10, 2), nullable=True))
        batch_op.add_column(sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False))

    # ✅ Reserved for upcoming external parts APIs (optional now)
    with op.batch_alter_table("parts", schema=None) as batch_op:
        batch_op.add_column(sa.Column("source", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("external_id", sa.String(length=100), nullable=True))


def downgrade():
    with op.batch_alter_table("parts", schema=None) as batch_op:
        batch_op.drop_column("external_id")
        batch_op.drop_column("source")

    with op.batch_alter_table("garage_parts", schema=None) as batch_op:
        batch_op.drop_column("is_active")
        batch_op.drop_column("cost_price")

    with op.batch_alter_table("orders", schema=None) as batch_op:
        batch_op.drop_column("created_at")

