"""add equipos and trabajadores tables (issue #35)

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# El tipo 'categoriaenum' ya existe (tabla incidencias, migración inicial)
# -> create_type=False para NO volver a crearlo.
categoria_enum = postgresql.ENUM(
    'infraestructura', 'alumbrado', 'residuos', 'trafico', 'zonas_verdes', 'otro',
    name='categoriaenum', create_type=False,
)


def upgrade() -> None:
    """Upgrade schema: tablas equipos y trabajadores (issue #35).

    `equipos.categoria` reutiliza el ENUM `categoriaenum` ya existente.
    `trabajadores.equipo_id` usa ON DELETE SET NULL: al borrar un equipo, sus
    trabajadores quedan sin equipo (no se borran).
    """
    op.create_table(
        'equipos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=120), nullable=False),
        sa.Column('categoria', categoria_enum, nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_equipos_id'), 'equipos', ['id'], unique=False)

    op.create_table(
        'trabajadores',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=120), nullable=False),
        sa.Column('puesto', sa.String(length=120), nullable=True),
        sa.Column('disponible', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('equipo_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['equipo_id'], ['equipos.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_trabajadores_id'), 'trabajadores', ['id'], unique=False)
    op.create_index(op.f('ix_trabajadores_equipo_id'), 'trabajadores', ['equipo_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema: borra trabajadores primero (por el FK) y luego
    equipos. NO se borra el tipo `categoriaenum` (lo usan otras tablas)."""
    op.drop_index(op.f('ix_trabajadores_equipo_id'), table_name='trabajadores')
    op.drop_index(op.f('ix_trabajadores_id'), table_name='trabajadores')
    op.drop_table('trabajadores')
    op.drop_index(op.f('ix_equipos_id'), table_name='equipos')
    op.drop_table('equipos')
