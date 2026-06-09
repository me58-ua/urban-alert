"""add prioridad to historial_estados

Revision ID: 12e6dba68cfb
Revises: 6adcb420bdd5
Create Date: 2026-06-09 23:38:25.040568

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '12e6dba68cfb'
down_revision: Union[str, Sequence[str], None] = '6adcb420bdd5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# El tipo enum 'prioridadenum' ya existe (creado con la tabla incidencias),
# por lo que se referencia con create_type=False para no intentar recrearlo.
prioridad_enum = postgresql.ENUM(
    'baja', 'media', 'alta', name='prioridadenum', create_type=False
)


def upgrade() -> None:
    """Upgrade schema: registrar también la prioridad en el historial."""
    op.add_column('historial_estados', sa.Column('prioridad_anterior', prioridad_enum, nullable=True))
    op.add_column('historial_estados', sa.Column('prioridad_nueva', prioridad_enum, nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('historial_estados', 'prioridad_nueva')
    op.drop_column('historial_estados', 'prioridad_anterior')
