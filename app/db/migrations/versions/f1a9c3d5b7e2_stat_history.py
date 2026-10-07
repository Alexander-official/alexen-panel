"""hourly history for the overview and statistics charts

Revision ID: f1a9c3d5b7e2
Revises: e5b2c8a1f4d7
Create Date: 2026-10-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'f1a9c3d5b7e2'
down_revision = 'e5b2c8a1f4d7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'stat_history',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('kind', sa.String(16), nullable=False),
        sa.Column('key', sa.String(128), nullable=False, server_default=""),
        sa.Column('value', sa.BigInteger(), nullable=False, server_default="0"),
        sa.UniqueConstraint('created_at', 'kind', 'key'),
    )
    op.create_index('ix_stat_history_created_at', 'stat_history', ['created_at'])


def downgrade():
    op.drop_index('ix_stat_history_created_at', table_name='stat_history')
    op.drop_table('stat_history')
