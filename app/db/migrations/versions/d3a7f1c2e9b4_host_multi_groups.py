"""hosts can be in several groups: group_name holds a comma separated list

Revision ID: d3a7f1c2e9b4
Revises: c9e1a3b7d5f2
Create Date: 2026-10-04 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'd3a7f1c2e9b4'
down_revision = 'c9e1a3b7d5f2'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('hosts') as b:
        b.alter_column('group_name', existing_type=sa.String(64), type_=sa.String(1024), existing_nullable=True)


def downgrade():
    with op.batch_alter_table('hosts') as b:
        b.alter_column('group_name', existing_type=sa.String(1024), type_=sa.String(64), existing_nullable=True)
