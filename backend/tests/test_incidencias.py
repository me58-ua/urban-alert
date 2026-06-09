def test_crear_incidencia(client):
    payload = {
        "titulo": "Bache en calle principal",
        "descripcion": "Bache grande peligroso",
        "categoria": "infraestructura",
        "prioridad": "alta",
        "latitud": 38.477,
        "longitud": -0.791
    }
    response = client.post("/incidencias", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["titulo"] == payload["titulo"]
    assert data["estado"] == "abierta"
    assert "id" in data

def test_get_incidencia_id(client):
    # Crear primero validando
    payload = {
        "titulo": "Incidencia para GET",
        "descripcion": "desc",
        "categoria": "alumbrado",
        "prioridad": "baja",
        "latitud": 10.0,
        "longitud": 20.0
    }
    create_res = client.post("/incidencias", json=payload)
    incidencia_id = create_res.json()["id"]

    # Traer incidencia
    get_res = client.get(f"/incidencias/{incidencia_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == incidencia_id
    assert get_res.json()["titulo"] == "Incidencia para GET"

    # Traer inexistente
    get_res_404 = client.get("/incidencias/9999")
    assert get_res_404.status_code == 404

def test_listar_incidencias(client):
    # Setup de 2 incidencias extras
    client.post("/incidencias", json={
        "titulo": "Inc 1", "categoria": "residuos", "latitud": 1.0, "longitud": 1.0
    })
    client.post("/incidencias", json={
        "titulo": "Inc 2", "categoria": "alumbrado", "prioridad": "alta", "latitud": 1.0, "longitud": 1.0
    })

    # Traer todas (paginación por defecto): respuesta con envoltura {items, total, limit, offset}
    res = client.get("/incidencias")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 2
    assert len(data["items"]) >= 2
    assert "limit" in data and "offset" in data

    # Probar filtros
    res_alumbrado = client.get("/incidencias?categoria=alumbrado")
    assert res_alumbrado.status_code == 200
    assert all(i["categoria"] == "alumbrado" for i in res_alumbrado.json()["items"])

    res_alta = client.get("/incidencias?prioridad=alta")
    assert res_alta.status_code == 200
    assert all(i["prioridad"] == "alta" for i in res_alta.json()["items"])

def test_filtro_geografico(client):
    # Incidencias en Madrid (-3.703790, 40.416775)
    client.post("/incidencias", json={
        "titulo": "Madrid Centro", "categoria": "infraestructura", "latitud": 40.4167, "longitud": -3.7032
    })
    # Incidencias en Barcelona (2.168365, 41.387497)
    client.post("/incidencias", json={
        "titulo": "Barcelona", "categoria": "infraestructura", "latitud": 41.3874, "longitud": 2.1683
    })

    # Consultar Madrid con radio 50km
    res_madrid = client.get("/incidencias?lat=40.4167&lng=-3.7032&radio=50000")
    assert res_madrid.status_code == 200
    titulos = [i["titulo"] for i in res_madrid.json()["items"]]
    assert "Madrid Centro" in titulos
    assert "Barcelona" not in titulos

    # Consultar con punto medio que no alcance (ej radio 10km en zaragoza 41.64, -0.88)
    res_zgz = client.get("/incidencias?lat=41.64&lng=-0.88&radio=10000")
    assert res_zgz.status_code == 200
    titulos_zgz = [i["titulo"] for i in res_zgz.json()["items"]]
    assert "Madrid Centro" not in titulos_zgz
    assert "Barcelona" not in titulos_zgz

def test_filtro_geografico_exacto(client):
    # El pre-filtro SQL es una caja (bounding box); el refinamiento Haversine debe
    # excluir los puntos que caen DENTRO de la caja pero FUERA del círculo de radio.
    # Centro (0,0), radio 10 km -> caja ~ ±0.0898°.
    # (0.08, 0.08) está dentro de la caja pero a ~12.6 km (fuera del círculo).
    client.post("/incidencias", json={
        "titulo": "Diagonal fuera", "categoria": "otro", "latitud": 0.08, "longitud": 0.08
    })
    # (0.05, 0.05) está a ~7.9 km (dentro del círculo).
    client.post("/incidencias", json={
        "titulo": "Diagonal dentro", "categoria": "otro", "latitud": 0.05, "longitud": 0.05
    })

    res = client.get("/incidencias?lat=0&lng=0&radio=10000")
    assert res.status_code == 200
    titulos = [i["titulo"] for i in res.json()["items"]]
    assert "Diagonal dentro" in titulos
    assert "Diagonal fuera" not in titulos  # excluido por Haversine, no solo por la caja

def test_paginacion(client):
    # Crear 5 incidencias adicionales
    for i in range(5):
        client.post("/incidencias", json={
            "titulo": f"Pag {i}", "categoria": "otro", "latitud": 0.0, "longitud": 0.0
        })

    # Página 1 (limit=2, offset=0)
    r1 = client.get("/incidencias?limit=2&offset=0")
    assert r1.status_code == 200
    d1 = r1.json()
    assert len(d1["items"]) == 2
    assert d1["limit"] == 2
    assert d1["offset"] == 0
    assert d1["total"] >= 5

    # Página 2 (limit=2, offset=2): items distintos a la página 1
    r2 = client.get("/incidencias?limit=2&offset=2")
    d2 = r2.json()
    assert len(d2["items"]) == 2
    ids1 = {i["id"] for i in d1["items"]}
    ids2 = {i["id"] for i in d2["items"]}
    assert ids1.isdisjoint(ids2)

    # Validación de límites: limit fuera de rango -> 422
    assert client.get("/incidencias?limit=0").status_code == 422
    assert client.get("/incidencias?limit=101").status_code == 422
    assert client.get("/incidencias?offset=-1").status_code == 422

def test_patch_estado(client, db_session, admin_headers, ciudadano_headers):
    # Crear incidencia
    payload = {
        "titulo": "Para Estado", "categoria": "trafico", "latitud": 1.0, "longitud": 1.0
    }
    create_res = client.post("/incidencias", json=payload)
    inc_id = create_res.json()["id"]

    # Sin token -> 401
    res_401 = client.patch(f"/incidencias/{inc_id}", json={"estado": "en_progreso"})
    assert res_401.status_code == 401

    # Token de ciudadano (rol insuficiente) -> 403
    res_403 = client.patch(
        f"/incidencias/{inc_id}", json={"estado": "en_progreso"}, headers=ciudadano_headers
    )
    assert res_403.status_code == 403

    # Token de admin -> 200
    res_200 = client.patch(
        f"/incidencias/{inc_id}",
        json={"estado": "en_progreso", "prioridad": "alta"},
        headers=admin_headers
    )
    assert res_200.status_code == 200
    assert res_200.json()["estado"] == "en_progreso"
    assert res_200.json()["prioridad"] == "alta"

    # Test Historial en BD
    from models import HistorialEstado
    historial = db_session.query(HistorialEstado).filter(HistorialEstado.incidencia_id == inc_id).all()
    assert len(historial) == 1
    assert historial[0].estado_anterior == "abierta"
    assert historial[0].estado_nuevo == "en_progreso"
    # También se registra el cambio de prioridad (media -> alta)
    assert historial[0].prioridad_anterior == "media"
    assert historial[0].prioridad_nueva == "alta"
    # El cambio queda atribuido al email del administrador autenticado
    assert historial[0].cambiado_por == "admin@test.com"


def test_patch_solo_prioridad(client, db_session, admin_headers):
    # Incidencia nueva: estado=abierta, prioridad=media (por defecto)
    create_res = client.post("/incidencias", json={
        "titulo": "Solo prioridad", "categoria": "otro", "latitud": 2.0, "longitud": 2.0
    })
    inc_id = create_res.json()["id"]

    # PATCH solo de prioridad (sin tocar estado)
    res = client.patch(f"/incidencias/{inc_id}", json={"prioridad": "alta"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["estado"] == "abierta"   # el estado no cambia
    assert res.json()["prioridad"] == "alta"

    from models import HistorialEstado
    hist = db_session.query(HistorialEstado).filter(HistorialEstado.incidencia_id == inc_id).all()
    # El cambio de SOLO prioridad también queda registrado (issue #6)
    assert len(hist) == 1
    assert hist[0].estado_anterior == "abierta"
    assert hist[0].estado_nuevo == "abierta"      # estado sin cambios
    assert hist[0].prioridad_anterior == "media"
    assert hist[0].prioridad_nueva == "alta"

    # PATCH sin cambios reales (misma prioridad) -> NO crea entrada de historial
    res_noop = client.patch(f"/incidencias/{inc_id}", json={"prioridad": "alta"}, headers=admin_headers)
    assert res_noop.status_code == 200
    hist2 = db_session.query(HistorialEstado).filter(HistorialEstado.incidencia_id == inc_id).all()
    assert len(hist2) == 1   # sigue habiendo solo 1

def test_subir_imagen(client):
    # Crear incidencia
    payload = {
        "titulo": "Incidencia con Foto", "categoria": "infraestructura", "latitud": 1.0, "longitud": 1.0
    }
    create_res = client.post("/incidencias", json=payload)
    inc_id = create_res.json()["id"]

    # Simular archivo de imagen
    file_bytes = b"fake_image_content"
    files = {"file": ("test_image.jpg", file_bytes, "image/jpeg")}
    
    # Test subida exitosa
    res_upload = client.post(f"/incidencias/{inc_id}/imagenes", files=files)
    assert res_upload.status_code == 201
    
    # Validar respuesta
    data = res_upload.json()
    assert "ruta" in data
    assert "id" in data
    assert data["ruta"].startswith("/uploads/")

    # Test mime type inválido
    files_pdf = {"file": ("test.pdf", b"pdf_content", "application/pdf")}
    res_bad = client.post(f"/incidencias/{inc_id}/imagenes", files=files_pdf)
    assert res_bad.status_code == 400
