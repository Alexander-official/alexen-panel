"""settings table and user online ip count

Revision ID: c9e1a3b7d5f2
Revises: b8f6c2a4d9e1
Create Date: 2026-10-04 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'c9e1a3b7d5f2'
down_revision = 'b8f6c2a4d9e1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'settings',
        sa.Column('key', sa.String(length=64), nullable=False),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('key'),
    )
    op.add_column('users', sa.Column('online_ip_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('hwid_count', sa.Integer(), nullable=False, server_default='0'))


def downgrade():
    with op.batch_alter_table('users') as b:
        b.drop_column('hwid_count')
        b.drop_column('online_ip_count')
    op.drop_table('settings')
