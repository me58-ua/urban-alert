from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from routers import incidencias
import os

os.makedirs("uploads", exist_ok=True)

# FastAPI initialization
app = FastAPI(
    title="Plataforma de Incidencias Urbanas API",
    description="API REST para gestionar incidencias urbanas con PostgreSQL y TDD",
    version="1.0.0"
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(incidencias.router)

@app.get("/ping")
def ping():
    """Endpoint básico para verificar que FastAPI funciona."""
    return {"message": "pong"}
