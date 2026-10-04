"""user inbound usages

Revision ID: d4b2e6f8a1c3
Revises: c3a1f5d7e9b2
Create Date: 2026-10-04 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4b2e6f8a1c3'
down_revision = 'c3a1f5d7e9b2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'user_inbound_usages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('inbound_tag', sa.String(length=256), nullable=False),
        sa.Column('used_traffic', sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'inbound_tag')
    )


def downgrade():
    op.drop_table('user_inbound_usages')
