"""media attachments and editing for admin messages

Revision ID: a9c7e2f4b8d6
Revises: e6f2a9c4d8b3
Create Date: 2026-10-28

"""
from alembic import op
import sqlalchemy as sa


revision = "a9c7e2f4b8d6"
down_revision = "e6f2a9c4d8b3"
branch_labels = None
depends_on = None


_COLS = [
    ("media_path", sa.String(length=255)),
    ("media_type", sa.String(length=16)),   # image | audio | video | file
    ("media_mime", sa.String(length=128)),
    ("media_name", sa.String(length=255)),
    ("media_size", sa.Integer()),
    ("edited_at", sa.DateTime()),
]


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("admin_messages")}
    for name, type_ in _COLS:
        if name not in cols:
            op.add_column("admin_messages", sa.Column(name, type_, nullable=True))


def downgrade() -> None:
    for name, _ in _COLS:
        op.drop_column("admin_messages", name)
