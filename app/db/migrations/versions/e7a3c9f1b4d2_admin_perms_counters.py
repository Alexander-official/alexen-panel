"""admin permissions (copy configs, edit limits) and counters; per-user attempt counters

Revision ID: e7a3c9f1b4d2
Revises: d5f1b8c3a7e2
Create Date: 2026-10-18

"""
from alembic import op
import sqlalchemy as sa

revision = "e7a3c9f1b4d2"
down_revision = "d5f1b8c3a7e2"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("admins") as b:
        # a reseller may do these only when the sudo/creator allows it (sudo/creator always may)
        b.add_column(sa.Column("can_copy_configs", sa.Boolean(), nullable=False, server_default="1"))
        b.add_column(sa.Column("can_edit_limits", sa.Boolean(), nullable=False, server_default="1"))
        b.add_column(sa.Column("users_created", sa.Integer(), nullable=False, server_default="0"))
        b.add_column(sa.Column("users_deleted", sa.Integer(), nullable=False, server_default="0"))
    with op.batch_alter_table("users") as b:
        # how many times a new IP was blocked / a new device was rejected (over the limit)
        b.add_column(sa.Column("ip_block_count", sa.Integer(), nullable=False, server_default="0"))
        b.add_column(sa.Column("hwid_reject_count", sa.Integer(), nullable=False, server_default="0"))


def downgrade():
    with op.batch_alter_table("users") as b:
        b.drop_column("hwid_reject_count")
        b.drop_column("ip_block_count")
    with op.batch_alter_table("admins") as b:
        b.drop_column("users_deleted")
        b.drop_column("users_created")
        b.drop_column("can_edit_limits")
        b.drop_column("can_copy_configs")
