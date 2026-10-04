"""user hwid devices

Revision ID: f6d4a8b1c3e5
Revises: e5c3f7a9b2d4
Create Date: 2026-10-04 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f6d4a8b1c3e5'
down_revision = 'e5c3f7a9b2d4'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('hwid_limit', sa.Integer(), nullable=True))
    op.create_table(
        'user_hwid_devices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('hwid', sa.String(length=256), nullable=False),
        sa.Column('platform', sa.String(length=64), nullable=True),
        sa.Column('os_version', sa.String(length=64), nullable=True),
        sa.Column('device_model', sa.String(length=128), nullable=True),
        sa.Column('user_agent', sa.String(length=512), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'hwid')
    )


def downgrade():
    op.drop_table('user_hwid_devices')
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('hwid_limit')
