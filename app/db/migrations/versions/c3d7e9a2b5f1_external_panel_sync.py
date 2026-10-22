"""external panel sync fields (interval / live / count_traffic / last_stats)

Revision ID: c3d7e9a2b5f1
Revises: f2b6d4e8a1c9
Create Date: 2026-10-22

"""
from alembic import op
import sqlalchemy as sa


revision = "c3d7e9a2b5f1"
down_revision = "f2b6d4e8a1c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("external_panels")}
    with op.batch_alter_table("external_panels") as batch:
        if "sync_interval" not in cols:
            batch.add_column(sa.Column("sync_interval", sa.Integer(), server_default="0", nullable=False))
        if "live" not in cols:
            batch.add_column(sa.Column("live", sa.Boolean(), server_default="0", nullable=False))
        if "count_traffic" not in cols:
            batch.add_column(sa.Column("count_traffic", sa.Boolean(), server_default="0", nullable=False))
        if "last_stats" not in cols:
            batch.add_column(sa.Column("last_stats", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("external_panels") as batch:
        batch.drop_column("last_stats")
        batch.drop_column("count_traffic")
        batch.drop_column("live")
        batch.drop_column("sync_interval")
