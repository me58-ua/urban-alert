def _crear_incidencia(client, titulo, lat=5.0, lng=5.0):
    res = client.post("/incidencias", json={
        "titulo": titulo, "categoria": "otro", "latitud": lat, "longitud": lng
    })
    return res.json()["id"]


def test_notificacion_creada_al_cambiar_estado(client, admin_headers):
    inc_id = _crear_incidencia(client, "Con notif")

    # Cambio de estado -> debe crear una notificación
    r = client.patch(f"/incidencias/{inc_id}", json={"estado": "en_progreso"}, headers=admin_headers)
    assert r.status_code == 200

    notifs = client.get(f"/notificaciones?incidencia_id={inc_id}")
    assert notifs.status_code == 200
    data = notifs.json()
    assert len(data) == 1
    assert data[0]["incidencia_id"] == inc_id
    assert data[0]["estado_nuevo"] == "en_progreso"
    assert data[0]["leida"] is False
    assert "mensaje" in data[0]


def test_no_notifica_si_solo_cambia_prioridad(client, admin_headers):
    inc_id = _crear_incidencia(client, "Solo prioridad notif", lat=6.0, lng=6.0)

    r = client.patch(f"/incidencias/{inc_id}", json={"prioridad": "alta"}, headers=admin_headers)
    assert r.status_code == 200

    notifs = client.get(f"/notificaciones?incidencia_id={inc_id}")
    assert notifs.status_code == 200
    assert notifs.json() == []  # un cambio de solo prioridad no notifica


def test_marcar_notificacion_leida(client, admin_headers):
    inc_id = _crear_incidencia(client, "Marcar leida", lat=7.0, lng=7.0)
    client.patch(f"/incidencias/{inc_id}", json={"estado": "resuelta"}, headers=admin_headers)
    notif_id = client.get(f"/notificaciones?incidencia_id={inc_id}").json()[0]["id"]

    # Marcar como leída
    r = client.patch(f"/notificaciones/{notif_id}/leer")
    assert r.status_code == 200
    assert r.json()["leida"] is True

    # El filtro leida=false ya no la incluye
    no_leidas = client.get(f"/notificaciones?incidencia_id={inc_id}&leida=false")
    assert all(n["id"] != notif_id for n in no_leidas.json())

    # Marcar una inexistente -> 404
    assert client.patch("/notificaciones/999999/leer").status_code == 404
