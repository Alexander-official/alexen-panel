"""important notifications, admin messages, warnings on users

Revision ID: b3d8f6a2c9e1
Revises: a7c4e2f9d1b3
Create Date: 2026-10-07 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'b3d8f6a2c9e1'
down_revision = 'a7c4e2f9d1b3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'alerts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('kind', sa.String(32), nullable=False),
        sa.Column('username', sa.String(64), nullable=True),
        sa.Column('admin', sa.String(64), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('detail', sa.String(2000), nullable=True),
        sa.Column('read', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index('ix_alerts_created_at', 'alerts', ['created_at'])
    op.create_index('ix_alerts_username', 'alerts', ['username'])
    op.create_index('ix_alerts_admin', 'alerts', ['admin'])
    op.create_table(
        'admin_messages',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('thread', sa.String(64), nullable=False),
        sa.Column('sender', sa.String(64), nullable=False),
        sa.Column('from_sudo', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('text', sa.String(4000), nullable=False),
        sa.Column('read', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index('ix_admin_messages_created_at', 'admin_messages', ['created_at'])
    op.create_index('ix_admin_messages_thread', 'admin_messages', ['thread'])
    with op.batch_alter_table('users') as batch:
        batch.add_column(sa.Column('warning', sa.String(500), nullable=True))
        batch.add_column(sa.Column('warning_at', sa.DateTime(), nullable=True))


def downgrade():
    with op.batch_alter_table('users') as batch:
        batch.drop_column('warning_at')
        batch.drop_column('warning')
    op.drop_table('admin_messages')
    op.drop_table('alerts')
