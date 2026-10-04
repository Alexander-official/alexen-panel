"""user ip limit

Revision ID: e5c3f7a9b2d4
Revises: d4b2e6f8a1c3
Create Date: 2026-10-04 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e5c3f7a9b2d4'
down_revision = 'd4b2e6f8a1c3'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('ip_limit', sa.Integer(), nullable=True))


def downgrade():
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('ip_limit')
