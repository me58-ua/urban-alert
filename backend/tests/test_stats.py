def test_estadisticas_sin_datos(client):
    # Debe ir primero: la BD del módulo aún está vacía (sin incidencias).
    res = client.get("/stats")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 0
    assert data["porcentaje_resueltas"] == 0
    assert data["tiempo_medio_resolucion_horas"] is None
    assert data["reportes_ultimos_7_dias"] == 0
    # Las claves de los conteos existen aunque todo esté a 0
    assert set(data["por_estado"].keys()) == {"abierta", "en_progreso", "resuelta", "rechazada"}
    assert sum(data["por_estado"].values()) == 0


def test_estadisticas(client, admin_headers):
    # Crear incidencias variadas
    ids = []
    for cat, prio in [("alumbrado", "alta"), ("residuos", "media"),
                      ("infraestructura", "baja"), ("otro", "media")]:
        r = client.post("/incidencias", json={
            "titulo": f"Stat {cat}", "categoria": cat, "prioridad": prio,
            "latitud": 1.0, "longitud": 1.0
        })
        ids.append(r.json()["id"])

    # Resolver una (cambia estado -> resuelta)
    client.patch(f"/incidencias/{ids[0]}", json={"estado": "resuelta"}, headers=admin_headers)

    res = client.get("/stats")
    assert res.status_code == 200
    data = res.json()

    assert data["total"] >= 4

    # Las claves de los conteos incluyen TODOS los valores del enum (con 0 si no hay)
    assert set(data["por_estado"].keys()) == {"abierta", "en_progreso", "resuelta", "rechazada"}
    assert set(data["por_prioridad"].keys()) == {"baja", "media", "alta"}
    assert set(data["por_categoria"].keys()) == {
        "infraestructura", "alumbrado", "residuos", "trafico", "zonas_verdes", "otro"
    }

    assert data["por_estado"]["resuelta"] >= 1
    assert data["por_categoria"]["alumbrado"] >= 1
    assert data["por_prioridad"]["alta"] >= 1

    # Coherencia de conteos
    assert sum(data["por_estado"].values()) == data["total"]
    assert sum(data["por_categoria"].values()) == data["total"]

    # % resueltas en rango
    assert 0 <= data["porcentaje_resueltas"] <= 100

    # Hay >=1 resuelta -> tiempo medio no nulo y >= 0
    assert data["tiempo_medio_resolucion_horas"] is not None
    assert data["tiempo_medio_resolucion_horas"] >= 0

    # Reportes por periodo (las recién creadas entran en la ventana)
    assert data["reportes_ultimos_7_dias"] >= 4
    assert data["reportes_ultimos_30_dias"] >= 4
