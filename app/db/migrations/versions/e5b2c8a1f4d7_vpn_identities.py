"""AmneziaWG / OpenVPN identity of each user: keys, certificate, tunnel address

Revision ID: e5b2c8a1f4d7
Revises: d3a7f1c2e9b4
Create Date: 2026-10-05 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'e5b2c8a1f4d7'
down_revision = 'd3a7f1c2e9b4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'vpn_identities',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        # position in every server's tunnel subnet (address = network + 1 + idx)
        sa.Column('idx', sa.Integer(), nullable=False, unique=True),
        sa.Column('awg_private_key', sa.String(64), nullable=False),
        sa.Column('awg_public_key', sa.String(64), nullable=False),
        sa.Column('awg_psk', sa.String(64), nullable=False),
        sa.Column('ovpn_cn', sa.String(80), nullable=False, unique=True),
        sa.Column('ovpn_cert', sa.Text(), nullable=False),
        sa.Column('ovpn_key', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table('vpn_identities')
