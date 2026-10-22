"""external panel prov_config (remembered provision selection + auto-provision)

Revision ID: d4e8f1a6c2b7
Revises: c3d7e9a2b5f1
Create Date: 2026-10-22

"""
from alembic import op
import sqlalchemy as sa


revision = "d4e8f1a6c2b7"
down_revision = "c3d7e9a2b5f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("external_panels")}
    if "prov_config" not in cols:
        with op.batch_alter_table("external_panels") as batch:
            batch.add_column(sa.Column("prov_config", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("external_panels") as batch:
        batch.drop_column("prov_config")
