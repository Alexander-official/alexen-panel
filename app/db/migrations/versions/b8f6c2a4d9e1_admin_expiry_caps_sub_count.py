"""admin expiry, per-user caps, subscription request count

Revision ID: b8f6c2a4d9e1
Revises: a7e5b9c2d4f6
Create Date: 2026-10-04 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'b8f6c2a4d9e1'
down_revision = 'a7e5b9c2d4f6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('sub_request_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('admins', sa.Column('expire_date', sa.DateTime(), nullable=True))
    op.add_column('admins', sa.Column('max_user_ip_limit', sa.Integer(), nullable=True))
    op.add_column('admins', sa.Column('max_user_hwid_limit', sa.Integer(), nullable=True))


def downgrade():
    with op.batch_alter_table('admins') as b:
        b.drop_column('max_user_hwid_limit')
        b.drop_column('max_user_ip_limit')
        b.drop_column('expire_date')
    with op.batch_alter_table('users') as b:
        b.drop_column('sub_request_count')
