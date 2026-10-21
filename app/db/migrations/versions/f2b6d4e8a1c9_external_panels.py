"""external panels (3x-ui / s-ui integration)

Revision ID: f2b6d4e8a1c9
Revises: e7a3c9f1b4d2
Create Date: 2026-10-21

"""
from alembic import op
import sqlalchemy as sa


revision = "f2b6d4e8a1c9"
down_revision = "e7a3c9f1b4d2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "external_panels" in sa.inspect(bind).get_table_names():
        return
    op.create_table(
        "external_panels",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("address", sa.String(length=512), nullable=False),
        sa.Column("panel_path", sa.String(length=128), server_default="/", nullable=False),
        sa.Column("username", sa.String(length=128), server_default="", nullable=False),
        sa.Column("password_enc", sa.String(length=1024), server_default="", nullable=False),
        sa.Column("token", sa.String(length=2048), nullable=True),
        sa.Column("scope", sa.JSON(), server_default="{}", nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("last_sync", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )


def downgrade() -> None:
    op.drop_table("external_panels")
