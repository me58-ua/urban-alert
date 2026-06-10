"""add activo (estado) to users

Revision ID: a1b2c3d4e5f6
Revises: 047eaaeea929
Create Date: 2026-06-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '047eaaeea929'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: añade el estado `activo` a users (issue #34).

    Columna NOT NULL con server_default="true" para que las filas existentes
    queden activas tras la migración. Un usuario inactivo no puede hacer login.
    """
    op.add_column(
        'users',
        sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.text('true')),
    )


def downgrade() -> None:
    """Downgrade schema: revierte la columna activo de users."""
    op.drop_column('users', 'activo')
