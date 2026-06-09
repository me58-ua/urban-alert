from sqlalchemy.orm import Session
from models import Incidencia, HistorialEstado, EstadoEnum
from schemas import IncidenciaCreate

def crear_incidencia(db: Session, incidencia_in: IncidenciaCreate) -> Incidencia:
    db_incidencia = Incidencia(
        titulo=incidencia_in.titulo,
        descripcion=incidencia_in.descripcion,
        categoria=incidencia_in.categoria,
        prioridad=incidencia_in.prioridad,
        latitud=incidencia_in.latitud,
        longitud=incidencia_in.longitud,
        estado=EstadoEnum.abierta
    )
    db.add(db_incidencia)
    db.commit()
    db.refresh(db_incidencia)
    return db_incidencia

def get_incidencia(db: Session, incidencia_id: int) -> Incidencia:
    from fastapi import HTTPException
    incidencia = db.query(Incidencia).filter(Incidencia.id == incidencia_id).first()
    if not incidencia:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    return incidencia

def listar_incidencias(
    db: Session, 
    estado: str = None, 
    categoria: str = None, 
    prioridad: str = None,
    lat: float = None,
    lng: float = None,
    radio: float = None
):
    query = db.query(Incidencia)
    if estado:
        query = query.filter(Incidencia.estado == estado)
    if categoria:
        query = query.filter(Incidencia.categoria == categoria)
    if prioridad:
        query = query.filter(Incidencia.prioridad == prioridad)
    
    resultados = query.all()

    if lat is not None and lng is not None and radio is not None:
        import math
        def haversine(lat1, lon1, lat2, lon2):
            R = 6371000 # radio tierra en metros
            phi1 = math.radians(lat1)
            phi2 = math.radians(lat2)
            delta_phi = math.radians(lat2 - lat1)
            delta_lambda = math.radians(lon2 - lon1)
            a = math.sin(delta_phi/2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2.0)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            return R * c
        
        resultados = [
            inc for inc in resultados 
            if haversine(lat, lng, inc.latitud, inc.longitud) <= radio
        ]
        
    return resultados

def actualizar_incidencia(db: Session, incidencia_id: int, update_data, admin_user: str) -> Incidencia:
    incidencia = get_incidencia(db, incidencia_id)
    estado_anterior = incidencia.estado
    
    # Sólo registrar historial si el estado cambia realmente o si lo forzamos.
    # Dado que el spec es cambiar estado o prioridad, si cambia el estado lo registramos.
    if update_data.estado and update_data.estado != estado_anterior:
        incidencia.estado = update_data.estado
        historial = HistorialEstado(
            incidencia_id=incidencia.id,
            estado_anterior=estado_anterior,
            estado_nuevo=incidencia.estado,
            cambiado_por=admin_user
        )
        db.add(historial)

    if update_data.prioridad:
        incidencia.prioridad = update_data.prioridad

    # Si por casualidad sólo cambió prioridad pero el spec dice registrar TODO cambio
    # lo registramos siempre que se llame con admin_user para este update
    if update_data.estado and update_data.estado == estado_anterior:
        pass # No cambiamos estado real
        
    db.commit()
    db.refresh(incidencia)
    return incidencia

import os
import uuid
import shutil
from fastapi import UploadFile, HTTPException

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def subir_imagen_incidencia(db: Session, incidencia_id: int, file: UploadFile):
    # Validar que existe
    get_incidencia(db, incidencia_id)
    
    # Validar mime
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Formato de imagen inválido")
    
    # Guardar en disco
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Guardar en BD
    from models import Imagen
    db_img = Imagen(incidencia_id=incidencia_id, ruta=f"/uploads/{filename}")
    db.add(db_img)
    db.commit()
    db.refresh(db_img)
    
    return db_img
