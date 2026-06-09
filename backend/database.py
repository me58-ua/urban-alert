import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Si se está corriendo en test, podríamos sobreescribir esta variable
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://admin:adminpassword@localhost:5432/incidencias_db"
)

# Engine de SQLAlchemy
engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
