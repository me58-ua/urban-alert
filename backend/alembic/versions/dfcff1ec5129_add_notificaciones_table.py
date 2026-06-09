"""add notificaciones table

Revision ID: dfcff1ec5129
Revises: 12e6dba68cfb
Create Date: 2026-06-09 23:47:37.638118

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'dfcff1ec5129'
down_revision: Union[str, Sequence[str], None] = '12e6dba68cfb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# El tipo 'estadoenum' ya existe (tabla incidencias) -> create_type=False.
estado_enum = postgresql.ENUM(
    'abierta', 'en_progreso', 'resuelta', 'rechazada', name='estadoenum', create_type=False
)


def upgrade() -> None:
    """Upgrade schema: tabla de notificaciones de cambios de estado."""
    op.create_table(
        'notificaciones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('incidencia_id', sa.Integer(), nullable=False),
        sa.Column('mensaje', sa.String(length=255), nullable=False),
        sa.Column('estado_nuevo', estado_enum, nullable=False),
        sa.Column('leida', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('fecha_creacion', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['incidencia_id'], ['incidencias.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_notificaciones_id'), 'notificaciones', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_notificaciones_id'), table_name='notificaciones')
    op.drop_table('notificaciones')
