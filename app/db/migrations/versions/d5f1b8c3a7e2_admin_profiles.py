"""admin profiles: a picture, a display name, a bio and a contact for each admin

Revision ID: d5f1b8c3a7e2
Revises: c4e7a9b2d1f3
Create Date: 2026-10-16

"""
from alembic import op
import sqlalchemy as sa

revision = "d5f1b8c3a7e2"
down_revision = "c4e7a9b2d1f3"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "admin_profiles",
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("admins.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("display_name", sa.String(64), nullable=True),
        sa.Column("bio", sa.String(500), nullable=True),
        sa.Column("contact", sa.String(100), nullable=True),
        sa.Column("avatar", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table("admin_profiles")
