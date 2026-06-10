"""add equipo_id (equipo asignado) to incidencias (issue #36)

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-11 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Nombre explícito de la FK para poder soltarla en el downgrade.
FK_NAME = 'fk_incidencias_equipo_id_equipos'


def upgrade() -> None:
    """Upgrade schema: añade el equipo asignado (equipo_id) a incidencias
    (issue #36).

    Columna NULLABLE (una incidencia puede no tener equipo) con FK a equipos y
    ON DELETE SET NULL (si se borra el equipo, la incidencia se conserva sin
    equipo). La validación de compatibilidad de categoría se aplica en el
    servicio, no a nivel de BD.
    """
    op.add_column('incidencias', sa.Column('equipo_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_incidencias_equipo_id'), 'incidencias', ['equipo_id'], unique=False)
    op.create_foreign_key(
        FK_NAME,
        'incidencias',
        'equipos',
        ['equipo_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    """Downgrade schema: revierte la columna equipo_id de incidencias."""
    op.drop_constraint(FK_NAME, 'incidencias', type_='foreignkey')
    op.drop_index(op.f('ix_incidencias_equipo_id'), table_name='incidencias')
    op.drop_column('incidencias', 'equipo_id')
