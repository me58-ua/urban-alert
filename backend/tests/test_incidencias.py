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

    # Traer todas (paginación por defecto)
    res = client.get("/incidencias")
    assert res.status_code == 200
    assert len(res.json()) >= 2

    # Probar filtros
    res_alumbrado = client.get("/incidencias?categoria=alumbrado")
    assert res_alumbrado.status_code == 200
    assert all(i["categoria"] == "alumbrado" for i in res_alumbrado.json())
    
    res_alta = client.get("/incidencias?prioridad=alta")
    assert res_alta.status_code == 200
    assert all(i["prioridad"] == "alta" for i in res_alta.json())

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
    titulos = [i["titulo"] for i in res_madrid.json()]
    assert "Madrid Centro" in titulos
    assert "Barcelona" not in titulos

    # Consultar con punto medio que no alcance (ej radio 10km en zaragoza 41.64, -0.88)
    res_zgz = client.get("/incidencias?lat=41.64&lng=-0.88&radio=10000")
    assert res_zgz.status_code == 200
    titulos_zgz = [i["titulo"] for i in res_zgz.json()]
    assert "Madrid Centro" not in titulos_zgz
    assert "Barcelona" not in titulos_zgz

def test_patch_estado(client, db_session):
    # Crear incidencia
    payload = {
        "titulo": "Para Estado", "categoria": "trafico", "latitud": 1.0, "longitud": 1.0
    }
    create_res = client.post("/incidencias", json=payload)
    inc_id = create_res.json()["id"]

    # Test Sin permiso
    res_403 = client.patch(f"/incidencias/{inc_id}", json={"estado": "en_progreso"})
    assert res_403.status_code == 403
    
    # Test Con permiso
    res_200 = client.patch(
        f"/incidencias/{inc_id}", 
        json={"estado": "en_progreso", "prioridad": "alta"},
        headers={"X-Role": "admin"}
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
