"""add user_id (autor) to incidencias

Revision ID: 047eaaeea929
Revises: dfcff1ec5129
Create Date: 2026-06-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '047eaaeea929'
down_revision: Union[str, Sequence[str], None] = 'dfcff1ec5129'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Nombre explícito de la FK para poder soltarla en el downgrade.
FK_NAME = 'fk_incidencias_user_id_users'


def upgrade() -> None:
    """Upgrade schema: añade el autor (user_id) a incidencias (issue #33).

    Columna NULLABLE (se permiten incidencias anónimas) con FK a users y
    ON DELETE SET NULL (si se borra el usuario, la incidencia se conserva sin
    autor).
    """
    op.add_column('incidencias', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_incidencias_user_id'), 'incidencias', ['user_id'], unique=False)
    op.create_foreign_key(
        FK_NAME,
        'incidencias',
        'users',
        ['user_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    """Downgrade schema: revierte la columna autor de incidencias."""
    op.drop_constraint(FK_NAME, 'incidencias', type_='foreignkey')
    op.drop_index(op.f('ix_incidencias_user_id'), table_name='incidencias')
    op.drop_column('incidencias', 'user_id')
