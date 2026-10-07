"""who did what in the panel, and from where

Revision ID: a7c4e2f9d1b3
Revises: f1a9c3d5b7e2
Create Date: 2026-10-07 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'a7c4e2f9d1b3'
down_revision = 'f1a9c3d5b7e2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'activity_log',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('admin', sa.String(64), nullable=True),
        sa.Column('action', sa.String(64), nullable=False),
        sa.Column('method', sa.String(8), nullable=True),
        sa.Column('path', sa.String(256), nullable=True),
        sa.Column('status', sa.Integer(), nullable=True),
        sa.Column('ip', sa.String(64), nullable=True),
        sa.Column('user_agent', sa.String(400), nullable=True),
        sa.Column('detail', sa.String(4000), nullable=True),
    )
    op.create_index('ix_activity_log_created_at', 'activity_log', ['created_at'])
    op.create_index('ix_activity_log_admin', 'activity_log', ['admin'])


def downgrade():
    op.drop_index('ix_activity_log_admin', table_name='activity_log')
    op.drop_index('ix_activity_log_created_at', table_name='activity_log')
    op.drop_table('activity_log')
