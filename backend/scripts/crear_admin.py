"""Crea (o promueve) el primer administrador — bootstrap (issue #27).

Uso (desde backend/):
  python scripts/crear_admin.py [email] [password]

Si no se pasan argumentos, usa BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD
del entorno (o del fichero .env).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from database import SessionLocal
import services.usuarios as usuarios_service


def main():
    email = sys.argv[1] if len(sys.argv) > 1 else settings.bootstrap_admin_email
    password = sys.argv[2] if len(sys.argv) > 2 else settings.bootstrap_admin_password

    if not email or not password:
        print(
            "Falta email/contraseña. Pásalos como argumentos "
            "o define BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD."
        )
        sys.exit(1)

    db = SessionLocal()
    try:
        user = usuarios_service.crear_admin_inicial(db, email=email, password=password)
        print(f"Administrador listo: {user.email} (rol={user.rol.value}, id={user.id})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
