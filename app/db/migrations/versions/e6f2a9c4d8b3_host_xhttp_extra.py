"""per-host xHTTP extra object

Revision ID: e6f2a9c4d8b3
Revises: d4e8f1a6c2b7
Create Date: 2026-10-23

"""
from alembic import op
import sqlalchemy as sa


revision = "e6f2a9c4d8b3"
down_revision = "d4e8f1a6c2b7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("hosts")}
    if "xhttp_extra" not in cols:
        op.add_column("hosts", sa.Column("xhttp_extra", sa.String(length=4000), nullable=True))


def downgrade() -> None:
    op.drop_column("hosts", "xhttp_extra")
