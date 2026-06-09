from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
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

# CORS: permite que el frontend (Angular/Ionic) consuma la API desde el navegador.
# Orígenes configurables vía variable de entorno ALLOWED_ORIGINS (separados por comas).
default_origins = [
    "http://localhost:4200",   # ng serve
    "http://localhost:8100",   # ionic serve
    "http://localhost",        # Capacitor (Android)
    "capacitor://localhost",   # Capacitor (iOS)
    "ionic://localhost",       # Ionic WebView
]
allowed_origins = os.getenv("ALLOWED_ORIGINS")
origins = [o.strip() for o in allowed_origins.split(",")] if allowed_origins else default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(incidencias.router)

@app.get("/ping")
def ping():
    """Endpoint básico para verificar que FastAPI funciona."""
    return {"message": "pong"}
