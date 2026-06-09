import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(setup_database):
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="function")
def crear_usuario(db_session):
    """Factory para crear usuarios en la BD de test con un rol concreto."""
    from models import User, RolEnum
    from security import hash_password

    def _crear(email, password="password123", rol=RolEnum.ciudadano):
        user = User(email=email, hashed_password=hash_password(password), rol=rol)
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _crear


@pytest.fixture(scope="function")
def admin_headers(crear_usuario):
    """Cabecera Authorization con un JWT de administrador."""
    from models import RolEnum
    from security import create_access_token

    admin = crear_usuario("admin@test.com", rol=RolEnum.admin)
    token = create_access_token(subject=admin.email, rol="admin")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def ciudadano_headers(crear_usuario):
    """Cabecera Authorization con un JWT de ciudadano (rol insuficiente para admin)."""
    from security import create_access_token

    user = crear_usuario("ciudadano@test.com")
    token = create_access_token(subject=user.email, rol="ciudadano")
    return {"Authorization": f"Bearer {token}"}
