"""admin limits and host groups

Revision ID: a7e5b9c2d4f6
Revises: f6d4a8b1c3e5
Create Date: 2026-10-04 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a7e5b9c2d4f6'
down_revision = 'f6d4a8b1c3e5'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('admins', sa.Column('users_limit', sa.Integer(), nullable=True))
    op.add_column('admins', sa.Column('traffic_limit', sa.BigInteger(), nullable=True))
    op.add_column('admins', sa.Column('host_groups', sa.JSON(), nullable=True))
    op.add_column('hosts', sa.Column('group_name', sa.String(length=64), nullable=True))


def downgrade():
    with op.batch_alter_table('hosts') as batch_op:
        batch_op.drop_column('group_name')
    with op.batch_alter_table('admins') as batch_op:
        batch_op.drop_column('host_groups')
        batch_op.drop_column('traffic_limit')
        batch_op.drop_column('users_limit')
