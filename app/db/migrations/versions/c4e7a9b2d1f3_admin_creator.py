"""creator admins: above sudo, they manage the sudo admins

Revision ID: c4e7a9b2d1f3
Revises: b3d8f6a2c9e1
Create Date: 2026-10-14

"""
from alembic import op
import sqlalchemy as sa

revision = "c4e7a9b2d1f3"
down_revision = "b3d8f6a2c9e1"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("admins") as batch:
        batch.add_column(sa.Column("is_creator", sa.Boolean(), nullable=False, server_default="0"))
    # the panel's owner: its first sudo admin becomes the creator
    op.execute("UPDATE admins SET is_creator = 1, is_sudo = 1 WHERE id = (SELECT MIN(id) FROM admins WHERE is_sudo = 1)")


def downgrade():
    with op.batch_alter_table("admins") as batch:
        batch.drop_column("is_creator")
